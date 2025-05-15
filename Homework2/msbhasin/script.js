// script.js

d3.csv("student_mental_health.csv").then(function(data) {
    data.forEach(d => {
      d.gender = d["Choose your gender"]?.trim();
      d.course = d["What is your course?"]?.trim();
      d.year   = d["Your current year of Study"]?.trim();
      d.cgpa   = d["What is your CGPA?"]?.trim();
      d.marital= d["Marital status"]?.trim();
      d.depression = d["Do you have Depression?"]?.trim();
      d.anxiety    = d["Do you have Anxiety?"]?.trim();
      d.panic      = d["Do you have Panic attack?"]?.trim();
      d.treatment  = d["Did you seek any specialist for a treatment?"]?.trim();
  
      // Normalize fields
      if (d.course) d.course = d.course.toLowerCase();
      if (d.year) d.year = d.year.toLowerCase();
      if (d.gender) d.gender = d.gender.charAt(0).toUpperCase() + d.gender.slice(1).toLowerCase();
  
      // Fix course names
      const courseMap = {
        "engin": "engineering", "engine": "engineering", "engineering": "engineering", "koe": "engineering",
        "bcs": "bcs", "bit": "bit", "it": "it", "cts": "cts",
        "islamic education": "islamic education", "pendidikan islam": "islamic education",
        "irkhs": "irkhs", "kirkhs": "irkhs", "Benl": "benl", "benl": "benl",
        "law": "law", "laws": "law", "human sciences": "human sciences"
      };
      if (d.course in courseMap) d.course = courseMap[d.course];
  
      // Normalize year
      if (d.year) {
        d.year = d.year.replace(/^year\s*/i, match => match.charAt(0).toUpperCase() + match.slice(1));
      }
  
      // Compute condition flags
      const dep = d.depression?.toLowerCase() === "yes";
      const anx = d.anxiety?.toLowerCase() === "yes";
      const pan = d.panic?.toLowerCase() === "yes";
      d.hasCondition = (dep || anx || pan) ? "Yes" : "No";
  
      const count = [dep, anx, pan].filter(Boolean).length;
      if (count === 0) d.conditionCategory = "None";
      else if (count === 1) d.conditionCategory = dep ? "Depression only" : anx ? "Anxiety only" : "Panic only";
      else if (count === 2) d.conditionCategory = "Two conditions";
      else if (count === 3) d.conditionCategory = "All three";
  
      // Course categories
      const eng = ["engineering", "bit", "bcs", "it", "cts"];
      const biz = ["business", "account", "banking", "econ", "kenms", "enm"];
      const sci = ["science", "biotechnology", "nursing", "radiography", "math", "mhsc", "kop"];
      const hum = ["human sciences", "psychology", "communication", "benl", "law", "ala", "malcom"];
      const isl = ["islamic education", "fiqh", "usuluddin", "irkhs", "taasl"];
  
      d.courseCategory = "Other/Unknown";
      if (eng.some(c => d.course?.includes(c))) d.courseCategory = "Engineering & Tech";
      else if (biz.some(c => d.course?.includes(c))) d.courseCategory = "Business & Economics";
      else if (sci.some(c => d.course?.includes(c))) d.courseCategory = "Health & Science";
      else if (hum.some(c => d.course?.includes(c))) d.courseCategory = "Humanities & Arts";
      else if (isl.some(c => d.course?.includes(c))) d.courseCategory = "Islamic Studies";
    });
  
    drawDonutChart(data);
    drawBarChart(data);
    drawSankey(data);
  });
  function drawDonutChart(data) {
    const width = 400, height = 400, radius = Math.min(width, height) / 2;
  
    // Count each condition category
    const conditionCounts = {};
    data.forEach(d => {
      const cat = d.conditionCategory;
      conditionCounts[cat] = (conditionCounts[cat] || 0) + 1;
    });
  
    const pieData = d3.pie().value(d => d[1])(Object.entries(conditionCounts));
    const arc = d3.arc().innerRadius(radius * 0.5).outerRadius(radius * 0.9);
    const color = d3.scaleOrdinal().domain(Object.keys(conditionCounts)).range(d3.schemeTableau10);
  
    const svg = d3.select("#donutChart")
      .append("svg")
      .attr("width", width).attr("height", height)
      .append("g")
      .attr("transform", `translate(${width / 2}, ${height / 2})`);
  
    svg.selectAll("path")
      .data(pieData)
      .enter()
      .append("path")
      .attr("d", arc)
      .attr("fill", d => color(d.data[0]))
      .attr("stroke", "#fff")
      .attr("stroke-width", 2);
  
    svg.selectAll("text")
      .data(pieData)
      .enter()
      .append("text")
      .attr("transform", d => `translate(${arc.centroid(d)})`)
      .attr("text-anchor", "middle")
      .attr("font-size", "12px")
      .text(d => `${(d.data[1] / data.length * 100).toFixed(1)}%`);
  
    // Add legend
    const legend = d3.select("#donutChart").append("div").attr("class", "legend");
    Object.keys(conditionCounts).forEach(cat => {
      const item = legend.append("div");
      item.append("span")
        .style("display", "inline-block")
        .style("width", "12px")
        .style("height", "12px")
        .style("background-color", color(cat))
        .style("margin-right", "6px");
      item.append("span").text(cat);
    });
  }
  function drawBarChart(data) {
    const grouped = {};
  
    data.forEach(d => {
      const course = d.courseCategory;
      const cond = d.conditionCategory;
  
      if (!grouped[course]) {
        grouped[course] = {
          "None": 0, "Depression only": 0, "Anxiety only": 0,
          "Panic only": 0, "Two conditions": 0, "All three": 0
        };
      }
      grouped[course][cond]++;
    });
  
    const categories = Object.keys(grouped);
    const keys = ["None", "Depression only", "Anxiety only", "Panic only", "Two conditions", "All three"];
    const stackData = categories.map(c => ({ course: c, ...grouped[c] }));
  
    const margin = { top: 40, right: 30, bottom: 80, left: 50 },
          width = 700 - margin.left - margin.right,
          height = 400 - margin.top - margin.bottom;
  
    const svg = d3.select("#barChart")
      .append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);
  
    const x = d3.scaleBand()
      .domain(categories)
      .range([0, width])
      .padding(0.2);
  
    const y = d3.scaleLinear()
      .domain([0, d3.max(stackData, d => keys.reduce((sum, k) => sum + d[k], 0))])
      .nice()
      .range([height, 0]);
  
    const color = d3.scaleOrdinal().domain(keys).range(d3.schemeTableau10);
  
    const stack = d3.stack().keys(keys);
    const series = stack(stackData);
  
    svg.append("g")
      .selectAll("g")
      .data(series)
      .join("g")
      .attr("fill", d => color(d.key))
      .selectAll("rect")
      .data(d => d)
      .join("rect")
      .attr("x", d => x(d.data.course))
      .attr("y", d => y(d[1]))
      .attr("height", d => y(d[0]) - y(d[1]))
      .attr("width", x.bandwidth());
  
    svg.append("g")
      .attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(x))
      .selectAll("text")
      .attr("transform", "rotate(-40)")
      .style("text-anchor", "end");
  
    svg.append("g").call(d3.axisLeft(y));
  
    // Axis labels
    svg.append("text")
      .attr("x", width / 2)
      .attr("y", height + margin.bottom - 20)
      .attr("text-anchor", "middle")
      .text("Course Category");
  
    svg.append("text")
      .attr("transform", "rotate(-90)")
      .attr("x", -height / 2)
      .attr("y", -margin.left + 15)
      .attr("text-anchor", "middle")
      .text("Number of Students");
  
    // Legend
    const legend = d3.select("#barChart").append("div").attr("class", "legend");
    keys.forEach(k => {
      const item = legend.append("div");
      item.append("span")
        .style("display", "inline-block")
        .style("width", "12px")
        .style("height", "12px")
        .style("background-color", color(k))
        .style("margin-right", "6px");
      item.append("span").text(k);
    });
  }
  function drawSankey(data) {
    const conditionCategories = [
      "None", "Depression only", "Anxiety only",
      "Panic only", "Two conditions", "All three"
    ];
    const treatmentOutcomes = ["Sought Treatment: Yes", "Sought Treatment: No"];
  
    const nodes = conditionCategories.concat(treatmentOutcomes).map(name => ({ name }));
    const links = [];
  
    // Aggregate flows from each condition to treatment outcome
    const flowCounts = {};
    data.forEach(d => {
      const cond = d.conditionCategory;
      const treat = d.treatment?.toLowerCase() === "yes" ? "yes" : "no";
      if (!flowCounts[cond]) flowCounts[cond] = { yes: 0, no: 0 };
      flowCounts[cond][treat]++;
    });
  
    conditionCategories.forEach((cond, i) => {
      const base = conditionCategories.length; // Index offset for treatment nodes
      links.push({
        source: i,
        target: base, // "Sought Treatment: Yes"
        value: flowCounts[cond]?.yes || 0
      });
      links.push({
        source: i,
        target: base + 1, // "Sought Treatment: No"
        value: flowCounts[cond]?.no || 0
      });
    });
  
    const width = 800, height = 400;
  
    const svg = d3.select("#sankeyChart")
      .append("svg")
      .attr("width", width)
      .attr("height", height);
  
    const sankey = d3.sankey()
      .nodeWidth(15)
      .nodePadding(12)
      .extent([[0, 0], [width, height]]);
  
    const graph = sankey({
      nodes: nodes.map(d => Object.assign({}, d)),
      links: links.map(d => Object.assign({}, d))
    });
  
    const color = d3.scaleOrdinal()
      .domain(conditionCategories)
      .range(d3.schemeTableau10);
  
    // Draw links
    svg.append("g")
      .selectAll("path")
      .data(graph.links)
      .enter()
      .append("path")
      .attr("d", d3.sankeyLinkHorizontal())
      .attr("fill", "none")
      .attr("stroke", d => color(nodes[d.source.index].name))
      .attr("stroke-opacity", 0.5)
      .attr("stroke-width", d => Math.max(1, d.width));
  
    // Draw nodes
    svg.append("g")
      .selectAll("rect")
      .data(graph.nodes)
      .enter()
      .append("rect")
      .attr("x", d => d.x0)
      .attr("y", d => d.y0)
      .attr("height", d => d.y1 - d.y0)
      .attr("width", d => d.x1 - d.x0)
      .attr("fill", d => conditionCategories.includes(d.name) ? color(d.name) : "#999")
      .attr("stroke", "#000");
  
    // Labels
    svg.append("g")
      .selectAll("text")
      .data(graph.nodes)
      .enter()
      .append("text")
      .attr("x", d => d.x0 < width / 2 ? d.x1 + 6 : d.x0 - 6)
      .attr("y", d => (d.y1 + d.y0) / 2)
      .attr("dy", "0.35em")
      .attr("text-anchor", d => d.x0 < width / 2 ? "start" : "end")
      .text(d => `${d.name} (${d.value})`);
  }
      