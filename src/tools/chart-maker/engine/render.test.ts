import { describe, expect, it } from "vitest";
import { samples } from "../samples";
import { boxStats } from "./charts/boxplot";
import { aggregate } from "./data";
import { charts, getChart, parseTable, renderChart, resolveDims, suggestMapping, typeTable } from "./index";
import { esc } from "./svg";
import { defaultOptions, resolveOptions } from "./options";
import { interpolate } from "./colors";

const load = (csv: string) => typeTable(parseTable(csv));
const parseSvg = (svg: string) => new DOMParser().parseFromString(svg, "image/svg+xml");

describe("renderChart", () => {
  it("renders every sample with its own chart as well-formed SVG", () => {
    for (const sample of samples) {
      const chart = getChart(sample.chart)!;
      const result = renderChart(chart, load(sample.data), sample.mapping, {});
      expect(result.ok, sample.id).toBe(true);
      if (!result.ok) continue;
      const doc = parseSvg(result.svg);
      expect(doc.querySelector("parsererror"), sample.id).toBeNull();
      expect(doc.documentElement.getAttribute("viewBox")).toBe("0 0 800 500");
      expect(result.svg).not.toMatch(/NaN|undefined/);
    }
  });

  it("renders every chart with an auto-suggested mapping for every sample", () => {
    for (const sample of samples) {
      const dataset = load(sample.data);
      for (const chart of charts) {
        const mapping = suggestMapping(chart, dataset);
        const result = renderChart(chart, dataset, mapping, {});
        if (!result.ok) continue; // the sample may lack a needed column type
        expect(parseSvg(result.svg).querySelector("parsererror"), `${sample.id}/${chart.id}`).toBeNull();
        expect(result.svg, `${sample.id}/${chart.id}`).not.toMatch(/NaN|undefined|Infinity/);
      }
    }
  });

  it("reports missing dimensions instead of rendering", () => {
    const dataset = load("a,b\nx,1");
    const result = renderChart(getChart("alluvial")!, dataset, { steps: { columns: ["a"] } }, {});
    expect(result).toEqual({ ok: false, issues: ["“Steps” needs at least 2 columns."] });
    expect(resolveDims(getChart("bar")!, dataset, {}).issues).toEqual(["Add a column to “Categories”."]);
  });

  it("ignores mapped columns of the wrong type", () => {
    const dataset = load("name,value\nx,1");
    const { dims } = resolveDims(getChart("bar")!, dataset, { y: { columns: ["name"] } });
    expect(dims.y).toBeUndefined();
  });

  it("escapes data in the markup", () => {
    const dataset = load('name,value\n"<script>&",1');
    const result = renderChart(getChart("bar")!, dataset, { x: { columns: ["name"] }, y: { columns: ["value"] } }, {});
    expect(result.ok && result.svg).toContain("&lt;script&gt;&amp;");
    expect(result.ok && result.svg).not.toContain("<script>");
  });

  it("aggregates bar values per category", () => {
    const dataset = load("cat,v\na,1\na,2\nb,5");
    const chart = getChart("bar")!;
    const sum = renderChart(chart, dataset, { x: { columns: ["cat"] }, y: { columns: ["v"], aggregation: "sum" } }, {});
    expect(sum.ok && sum.svg).toContain("<title>a: 3</title>");
    const count = renderChart(chart, dataset, { x: { columns: ["cat"] } }, {});
    expect(count.ok && count.svg).toContain("<title>a: 2</title>");
  });

  it("honors size, background and legend options", () => {
    const sample = samples[0];
    const result = renderChart(getChart("line")!, load(sample.data), sample.mapping, { width: 300, height: 200, background: "#000000", showLegend: true });
    expect(result.ok && result.width).toBe(300);
    expect(result.ok && result.svg).toContain('fill="#000000"');
    expect(result.ok && result.svg).toContain('class="legend"');
    const clear = renderChart(getChart("line")!, load(sample.data), sample.mapping, { transparent: true, showLegend: false });
    expect(clear.ok && clear.svg).not.toContain('class="legend"');
    expect(clear.ok && clear.svg).not.toContain('fill="#ffffff" width');
  });
});

describe("suggestMapping", () => {
  it("prefers each dimension's first type and keeps fitting previous columns", () => {
    const dataset = load("when,city,temp,rain\n2024-01-01,Oslo,1,30");
    expect(suggestMapping(getChart("line")!, dataset)).toEqual({
      x: { columns: ["when"], aggregation: "sum" },
      y: { columns: ["temp"], aggregation: "sum" },
    });
    const kept = suggestMapping(getChart("bar")!, dataset, { y: { columns: ["rain"], aggregation: "mean" } });
    expect(kept.y).toEqual({ columns: ["rain"], aggregation: "mean" });
    expect(kept.x).toEqual({ columns: ["city"], aggregation: "sum" });
  });
});

describe("helpers", () => {
  it("aggregates", () => {
    expect(aggregate([1, 2, 6], "sum")).toBe(9);
    expect(aggregate([1, 2, 6], "mean")).toBe(3);
    expect(aggregate([1, 2, 6], "median")).toBe(2);
    expect(aggregate([1, 2, 6], "count")).toBe(3);
    expect(aggregate([], "max")).toBe(0);
  });

  it("computes box plot statistics with outliers", () => {
    const s = boxStats([1, 2, 3, 4, 5, 6, 7, 8, 100])!;
    expect(s.median).toBe(5);
    expect(s.outliers).toEqual([100]);
    expect(s.high).toBe(8);
  });

  it("clamps options and drops invalid values", () => {
    const chart = getChart("bar")!;
    const o = resolveOptions(chart, { width: 99999, orientation: "diagonal", background: "red", showGrid: false });
    expect(o.width).toBe(4000);
    expect(o.orientation).toBe(defaultOptions(chart).orientation);
    expect(o.background).toBe("#ffffff");
    expect(o.showGrid).toBe(false);
  });

  it("interpolates color ramps", () => {
    expect(interpolate(["#000000", "#ffffff"], 0.5)).toBe("#808080");
    expect(interpolate(["#000000", "#ffffff"], 2)).toBe("#ffffff");
  });

  it("escapes markup characters", () => {
    expect(esc(`<a href="x">'&'</a>`)).toBe("&lt;a href=&quot;x&quot;&gt;&#39;&amp;&#39;&lt;/a&gt;");
  });
});
