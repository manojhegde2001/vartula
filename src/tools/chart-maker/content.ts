import type { ToolContent } from "@/lib/tool-content";

/** Server-rendered copy for the Chart Maker page, also served as Markdown to AI agents. */
export const content: ToolContent = {
  summaryTitle: "A data visualization tool that runs in your browser",
  summary: [
    "The Chart Maker turns a spreadsheet into a publication-ready chart in four steps, in the spirit of RAWGraphs: load data, choose a chart, map your columns to the chart's dimensions, then customize and export. It reads CSV, TSV, semicolon-separated text and JSON, and cells copied straight from Excel, Google Sheets or Numbers.",
    "Beyond bar, line and pie charts it draws streamgraphs, bubble charts, heatmaps, treemaps, circle packing, sunbursts, alluvial (Sankey) diagrams and box plots. Exports are clean SVG you can refine in Figma, Illustrator or Inkscape, or PNG and JPG at up to 3× resolution. Your data never leaves your device.",
  ],
  howToTitle: "How to make a chart from your data",
  howTo: [
    "Paste your data, drop or upload a CSV, TSV or JSON file, or start from a sample dataset. Check the detected column types (number, date or text) and change any that look wrong.",
    "Choose a chart type: bar, line, streamgraph, scatter, pie, heatmap, treemap, circle packing, sunburst, alluvial or box plot.",
    "Map columns to the chart's dimensions by dragging them or picking them from the lists. Numeric dimensions combine rows with a sum, average, median, minimum, maximum or count.",
    "Adjust the size, margins, colors, labels and chart-specific options, then download SVG, PNG or JPG, or copy the SVG code.",
  ],
  features: {
    title: "Chart types",
    items: [
      { name: "Bar chart", description: "Totals per category, vertical or horizontal, with stacked, side-by-side or 100% series." },
      { name: "Line chart", description: "Trends over dates or numbers, one line per series, with smooth or step curves." },
      { name: "Streamgraph", description: "Stacked areas over time, as a flowing streamgraph, centered, stacked or 100%." },
      { name: "Scatter plot", description: "One dot per row; add size for a bubble chart, plus color and labels." },
      { name: "Pie / donut", description: "Parts of a whole, with percentage labels and an optional total in the middle." },
      { name: "Heatmap", description: "A grid of colored cells across two dimensions, on a sequential color ramp." },
      { name: "Treemap", description: "Nested rectangles sized by value across any number of hierarchy levels." },
      { name: "Circle packing", description: "Nested circles sized by value, for hierarchies at a glance." },
      { name: "Sunburst", description: "Concentric rings that show a hierarchy radiating from the center." },
      { name: "Alluvial diagram", description: "Flows between the categories of two or more columns, like a Sankey diagram." },
      { name: "Box plot", description: "Median, quartiles, whiskers and outliers for each group." },
    ],
  },
  faq: [
    {
      question: "Is my data uploaded anywhere?",
      answer:
        "No. Parsing, charting and every export happen entirely in your browser. Nothing you paste or upload is sent to a server, so it is safe to use with private data.",
    },
    {
      question: "Which data formats can I use?",
      answer:
        "Comma-, tab-, semicolon- or pipe-separated text (CSV and TSV) with a header row, and JSON arrays of objects or arrays. You can also copy a range of cells from Excel, Google Sheets or Numbers and paste it directly. Excel files themselves must be exported as CSV first.",
    },
    {
      question: "How are dates recognized?",
      answer:
        "Columns where every value looks like an ISO date, such as 2024-03-15, 2024-03 or 2024/03/15 with an optional time, are treated as dates. A bare year like 2024 is read as a number. You can change any column's type in the data table.",
    },
    {
      question: "What happens when several rows share the same category?",
      answer:
        "They are combined. By default the values are summed, and you can switch each numeric dimension to average, median, minimum, maximum or a row count. Leave a size dimension empty to simply count rows.",
    },
    {
      question: "Can I edit the exported chart?",
      answer:
        "Yes. The SVG export is plain, well-structured vector markup with grouped axes, marks, labels and legend, so it opens cleanly in Figma, Adobe Illustrator, Affinity Designer and Inkscape for final touches.",
    },
    {
      question: "How is this different from RAWGraphs?",
      answer:
        "It follows the same load, choose, map and customize workflow and also runs fully in the browser. Vartula's version focuses on a curated set of charts with sensible defaults, automatic column mapping when you switch charts, light and dark backgrounds, and PNG or JPG export at up to 3× resolution.",
    },
  ],
};
