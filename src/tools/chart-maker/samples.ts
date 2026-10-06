import type { Mapping } from "./engine";

export interface Sample {
  id: string;
  name: string;
  description: string;
  /** Chart and mapping shown when the sample loads. */
  chart: string;
  mapping: Mapping;
  data: string;
}

const m = (columns: string[]) => ({ columns, aggregation: "sum" as const });

/** Built-in datasets. Made-up numbers, for trying the charts out. */
export const samples: Sample[] = [
  {
    id: "coffee",
    name: "Coffee shop sales",
    description: "Cups sold per product and month",
    chart: "line",
    mapping: { x: m(["month"]), y: m(["cups"]), series: m(["product"]) },
    data: `month,product,cups,revenue
2025-01-01,Espresso,471,1318.80
2025-01-01,Latte,761,3196.20
2025-01-01,Cappuccino,453,1766.70
2025-01-01,Iced tea,162,518.40
2025-02-01,Espresso,435,1218.00
2025-02-01,Latte,720,3024.00
2025-02-01,Cappuccino,415,1618.50
2025-02-01,Iced tea,143,457.60
2025-03-01,Espresso,405,1134.00
2025-03-01,Latte,681,2860.20
2025-03-01,Cappuccino,423,1649.70
2025-03-01,Iced tea,156,499.20
2025-04-01,Espresso,397,1111.60
2025-04-01,Latte,586,2461.20
2025-04-01,Cappuccino,368,1435.20
2025-04-01,Iced tea,296,947.20
2025-05-01,Espresso,393,1100.40
2025-05-01,Latte,539,2263.80
2025-05-01,Cappuccino,339,1322.10
2025-05-01,Iced tea,401,1283.20
2025-06-01,Espresso,361,1010.80
2025-06-01,Latte,535,2247.00
2025-06-01,Cappuccino,312,1216.80
2025-06-01,Iced tea,435,1392.00
2025-07-01,Espresso,405,1134.00
2025-07-01,Latte,545,2289.00
2025-07-01,Cappuccino,330,1287.00
2025-07-01,Iced tea,418,1337.60
2025-08-01,Espresso,394,1103.20
2025-08-01,Latte,604,2536.80
2025-08-01,Cappuccino,376,1466.40
2025-08-01,Iced tea,277,886.40
2025-09-01,Espresso,437,1223.60
2025-09-01,Latte,689,2893.80
2025-09-01,Cappuccino,439,1712.10
2025-09-01,Iced tea,155,496.00
2025-10-01,Espresso,521,1458.80
2025-10-01,Latte,795,3339.00
2025-10-01,Cappuccino,447,1743.30
2025-10-01,Iced tea,170,544.00
2025-11-01,Espresso,537,1503.60
2025-11-01,Latte,774,3250.80
2025-11-01,Cappuccino,498,1942.20
2025-11-01,Iced tea,176,563.20
2025-12-01,Espresso,550,1540.00
2025-12-01,Latte,778,3267.60
2025-12-01,Cappuccino,544,2121.60
2025-12-01,Iced tea,175,560.00
`,
  },
  {
    id: "catalog",
    name: "Product catalog",
    description: "Price, rating and sales of 20 products",
    chart: "scatter",
    mapping: { x: m(["price"]), y: m(["rating"]), size: m(["units sold"]), color: m(["category"]), label: m(["product"]) },
    data: `product,category,price,rating,units sold
Trail runner,Shoes,129,4.6,1840
City sneaker,Shoes,89,4.1,3120
Hiking boot,Shoes,179,4.7,960
Flip flop,Shoes,19,3.6,5400
Rain jacket,Outerwear,149,4.4,1210
Puffer vest,Outerwear,99,4.0,1680
Wool coat,Outerwear,259,4.8,420
Windbreaker,Outerwear,69,3.8,2250
Daypack,Bags,59,4.3,2890
Duffel,Bags,89,4.5,1130
Tote,Bags,29,4.0,4100
Camera sling,Bags,49,3.7,780
Beanie,Accessories,22,4.2,3650
Sunglasses,Accessories,79,3.9,1990
Leather belt,Accessories,45,4.4,1420
Water bottle,Accessories,25,4.6,6200
Merino tee,Tops,55,4.5,2780
Flannel shirt,Tops,65,4.2,1950
Hoodie,Tops,75,4.7,3340
Tank top,Tops,25,3.5,2100
`,
  },
  {
    id: "budget",
    name: "Company budget",
    description: "Budget by division, department and team",
    chart: "treemap",
    mapping: { levels: m(["division", "department"]), size: m(["budget"]) },
    data: `division,department,team,budget
Product,Engineering,Platform,1850000
Product,Engineering,Mobile,1220000
Product,Engineering,Web,1430000
Product,Design,Research,380000
Product,Design,Visual,450000
Product,Data,Analytics,610000
Product,Data,Machine learning,890000
Go-to-market,Sales,Enterprise,1520000
Go-to-market,Sales,Self-serve,540000
Go-to-market,Marketing,Brand,720000
Go-to-market,Marketing,Growth,930000
Go-to-market,Support,Customer care,680000
Go-to-market,Support,Success,470000
Operations,Finance,Accounting,410000
Operations,Finance,Planning,260000
Operations,People,Recruiting,520000
Operations,People,Learning,190000
Operations,Legal,Contracts,310000
Operations,IT,Workplace,440000
`,
  },
  {
    id: "journeys",
    name: "Customer journeys",
    description: "From sign-up channel to plan to outcome",
    chart: "alluvial",
    mapping: { steps: m(["channel", "plan", "outcome"]), size: m(["customers"]) },
    data: `channel,plan,outcome,customers
Search,Free,Churned,620
Search,Free,Upgraded,180
Search,Pro,Renewed,340
Search,Pro,Churned,90
Social,Free,Churned,710
Social,Free,Upgraded,120
Social,Pro,Renewed,150
Social,Pro,Churned,80
Referral,Free,Upgraded,210
Referral,Free,Churned,160
Referral,Pro,Renewed,380
Referral,Team,Renewed,240
Referral,Team,Churned,30
Ads,Free,Churned,540
Ads,Pro,Renewed,130
Ads,Pro,Churned,110
Ads,Team,Renewed,90
`,
  },
  {
    id: "traffic",
    name: "Website traffic",
    description: "Visits by weekday and time of day",
    chart: "heatmap",
    mapping: { x: m(["hour"]), y: m(["day"]), color: m(["visits"]) },
    data: `day,hour,visits
Mon,00:00,40
Mon,02:00,43
Mon,04:00,67
Mon,06:00,176
Mon,08:00,478
Mon,10:00,984
Mon,12:00,901
Mon,14:00,529
Mon,16:00,291
Mon,18:00,481
Mon,20:00,612
Mon,22:00,399
Tue,00:00,40
Tue,02:00,43
Tue,04:00,64
Tue,06:00,193
Tue,08:00,548
Tue,10:00,974
Tue,12:00,847
Tue,14:00,517
Tue,16:00,330
Tue,18:00,534
Tue,20:00,673
Tue,22:00,460
Wed,00:00,40
Wed,02:00,43
Wed,04:00,66
Wed,06:00,208
Wed,08:00,472
Wed,10:00,822
Wed,12:00,992
Wed,14:00,562
Wed,16:00,294
Wed,18:00,429
Wed,20:00,634
Wed,22:00,504
Thu,00:00,40
Thu,02:00,43
Thu,04:00,67
Thu,06:00,203
Thu,08:00,501
Thu,10:00,835
Thu,12:00,842
Thu,14:00,487
Thu,16:00,349
Thu,18:00,450
Thu,20:00,707
Thu,22:00,488
Fri,00:00,40
Fri,02:00,43
Fri,04:00,67
Fri,06:00,184
Fri,08:00,456
Fri,10:00,849
Fri,12:00,870
Fri,14:00,567
Fri,16:00,348
Fri,18:00,526
Fri,20:00,622
Fri,22:00,486
Sat,00:00,40
Sat,02:00,42
Sat,04:00,52
Sat,06:00,86
Sat,08:00,165
Sat,10:00,343
Sat,12:00,445
Sat,14:00,694
Sat,16:00,638
Sat,18:00,576
Sat,20:00,348
Sat,22:00,152
Sun,00:00,40
Sun,02:00,42
Sun,04:00,52
Sun,06:00,88
Sun,08:00,180
Sun,10:00,275
Sun,12:00,560
Sun,14:00,602
Sun,16:00,737
Sun,18:00,470
Sun,20:00,349
Sun,22:00,175
`,
  },
  {
    id: "survey",
    name: "Survey completion times",
    description: "Seconds to finish, by device",
    chart: "boxplot",
    mapping: { value: m(["seconds"]), group: m(["device"]) },
    data: `device,seconds
Desktop,167
Desktop,238
Desktop,344
Desktop,219
Desktop,136
Desktop,270
Desktop,124
Desktop,311
Desktop,262
Desktop,214
Desktop,237
Desktop,210
Desktop,258
Desktop,228
Desktop,240
Desktop,190
Desktop,164
Desktop,165
Desktop,196
Desktop,244
Desktop,167
Desktop,174
Desktop,232
Desktop,214
Desktop,149
Desktop,263
Desktop,258
Desktop,267
Desktop,366
Desktop,134
Desktop,210
Desktop,304
Desktop,161
Desktop,84
Desktop,171
Desktop,192
Desktop,292
Desktop,273
Desktop,208
Desktop,147
Tablet,308
Tablet,249
Tablet,407
Tablet,377
Tablet,287
Tablet,254
Tablet,186
Tablet,584
Tablet,231
Tablet,327
Tablet,220
Tablet,64
Tablet,296
Tablet,249
Tablet,276
Tablet,261
Tablet,315
Tablet,203
Tablet,292
Tablet,253
Tablet,175
Tablet,239
Tablet,225
Tablet,236
Tablet,210
Tablet,281
Tablet,263
Tablet,185
Tablet,345
Tablet,159
Tablet,219
Tablet,345
Tablet,256
Tablet,118
Tablet,277
Tablet,229
Tablet,318
Tablet,230
Tablet,85
Tablet,166
Phone,278
Phone,370
Phone,199
Phone,334
Phone,150
Phone,328
Phone,163
Phone,585
Phone,349
Phone,305
Phone,316
Phone,282
Phone,339
Phone,369
Phone,123
Phone,167
Phone,195
Phone,452
Phone,229
Phone,233
Phone,193
Phone,325
Phone,287
Phone,406
Phone,475
Phone,351
Phone,279
Phone,328
Phone,281
Phone,442
Phone,239
Phone,429
Phone,239
Phone,415
Phone,341
Phone,420
Phone,335
Phone,259
Phone,477
Phone,297
`,
  },
];

export const defaultSample = samples[0];
