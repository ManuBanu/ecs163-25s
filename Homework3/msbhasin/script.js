// ECS163 Homework 3: Student Mental Health Dashboard Script

// Global variables for data and filters
let fullData = [];
let filterConditionCategory = null;
let filterCourse = null;
let filterTreatment = null;
let filterYearRange = null;
let filterCgpaRange = null;

// Define condition categories and color scale (consistent across charts)
const condCategories = ["None", "Depression only", "Anxiety only", "Panic only", "Two conditions", "All three"];
const colorScaleCond = d3.scaleOrdinal(condCategories, d3.schemeTableau10);

// Tooltip setup
const tooltip = d3.select("body").append("div")
    .attr("id", "tooltip")
    .style("position", "absolute")
    .style("padding", "4px")
    .style("background", "#fff")
    .style("border", "1px solid #ccc")
    .style("border-radius", "4px")
    .style("pointer-events", "none")
    .style("opacity", 0);

function showTooltip(content, x, y) {
    tooltip.html(content)
        .style("left", (x + 10) + "px")
        .style("top", (y + 10) + "px")
        .transition().duration(200)
        .style("opacity", 0.9);
}
function hideTooltip() {
    tooltip.transition().duration(200)
        .style("opacity", 0);
}

// Draw Donut Chart (Overview of Condition Categories)
function drawDonutChart(data) {
    const width = 400, height = 400;
    const radius = Math.min(width, height) / 2;
    // Aggregate counts for each condition category in this data subset
    const conditionCounts = {};
    data.forEach(d => {
        const cat = d.conditionCategory;
        conditionCounts[cat] = (conditionCounts[cat] || 0) + 1;
    });
    const categories = Object.keys(conditionCounts);
    // Pie generator for counts
    const pie = d3.pie().value(d => d[1]);
    const pieData = pie(Object.entries(conditionCounts));
    const arc = d3.arc().innerRadius(radius * 0.5).outerRadius(radius * 0.9);
    // Create SVG container
    const svg = d3.select("#donutChart").append("svg")
        .attr("width", width).attr("height", height)
        .append("g")
        .attr("transform", `translate(${width/2}, ${height/2})`);
    // Title
    svg.append("text")
        .attr("x", 0).attr("y", -height/2 + 20)
        .attr("text-anchor", "middle")
        .attr("font-weight", "bold")
        .text("Condition Category Distribution (Overview)");
    // Draw slices
    const slices = svg.selectAll("path.slice")
        .data(pieData, d => d.data[0]);  // key by category name
    slices.enter().append("path")
        .attr("class", "slice")
        .attr("d", arc)
        .attr("fill", d => colorScaleCond(d.data[0]))
        .attr("stroke", "#fff")
        .on("click", (event, d) => {
            const category = d.data[0];
            if (filterConditionCategory && filterConditionCategory === category && !filterCourse) {
                // Toggle off if same category (and no specific course filter active)
                filterConditionCategory = null;
            } else {
                // Set new category filter
                filterConditionCategory = category;
            }
            // Clear any course-specific filter when selecting via donut
            filterCourse = null;
            // Apply filters
            applyFilters();
        })
        .on("mouseover", (event, d) => {
            const category = d.data[0];
            const count = d.data[1];
            const total = data.length;
            const pct = total ? ((count / total) * 100).toFixed(1) : "0.0";
            showTooltip(`${category}: ${count} students (${pct}%)`, event.pageX, event.pageY);
        })
        .on("mouseout", hideTooltip);
    // Add category labels on slices
    svg.selectAll("text.label")
        .data(pieData)
        .enter().append("text")
        .attr("class", "label")
        .attr("transform", d => `translate(${arc.centroid(d)})`)
        .attr("text-anchor", "middle")
        .attr("dy", "0.35em")
        .text(d => d.data[0]);
}

// Draw Heatmap (Conditions Across Course Categories)
function drawHeatmap(data) {
    // Aggregate data: count students for each combination of courseCategory and conditionCategory
    const grouped = {};
    data.forEach(d => {
        const courseCat = d.courseCategory;
        const condCat = d.conditionCategory;
        if (!grouped[courseCat]) grouped[courseCat] = {};
        grouped[courseCat][condCat] = (grouped[courseCat][condCat] || 0) + 1;
    });
    const courseCats = Object.keys(grouped);
    // Use fixed condition categories order for rows
    const condCats = condCategories;
    // Prepare array of cell data
    let heatmapData = [];
    courseCats.forEach(course => {
        condCats.forEach(cond => {
            heatmapData.push({
                course: course,
                condition: cond,
                count: grouped[course][cond] || 0
            });
        });
    });
    // Dimensions and margins
    const margin = { top: 50, right: 100, bottom: 80, left: 150 },
          width = 600 - margin.left - margin.right,
          height = 400 - margin.top - margin.bottom;
    // Scales
    const x = d3.scaleBand().domain(courseCats).range([0, width]).padding(0.05);
    const y = d3.scaleBand().domain(condCats).range([0, height]).padding(0.05);
    const maxCount = d3.max(heatmapData, d => d.count);
    const colorScale = d3.scaleSequential().domain([0, maxCount || 0]).interpolator(d3.interpolateBlues);
    // Create SVG container
    const svg = d3.select("#heatmap").append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);
    // Title
    svg.append("text")
        .attr("x", width / 2)
        .attr("y", -10)
        .attr("text-anchor", "middle")
        .attr("font-weight", "bold")
        .text("Conditions Across Course Categories");
    // X-axis (Course Categories)
    svg.append("g")
        .attr("transform", `translate(0, ${height})`)
        .call(d3.axisBottom(x))
        .selectAll("text")
        .attr("transform", "rotate(-40)")
        .style("text-anchor", "end");
    // Y-axis (Condition Categories)
    svg.append("g")
        .call(d3.axisLeft(y));
    // Axis labels
    svg.append("text")
        .attr("x", width / 2)
        .attr("y", height + margin.bottom - 5)
        .attr("text-anchor", "middle")
        .attr("font-weight", "bold")
        .text("Course Category");
    svg.append("text")
        .attr("transform", "rotate(-90)")
        .attr("x", -height / 2)
        .attr("y", -margin.left + 15)
        .attr("text-anchor", "middle")
        .attr("font-weight", "bold")
        .text("Condition Category");
    // Draw heatmap cells
    svg.selectAll("rect.cell")
        .data(heatmapData)
        .enter().append("rect")
        .attr("class", "cell")
        .attr("x", d => x(d.course))
        .attr("y", d => y(d.condition))
        .attr("width", x.bandwidth())
        .attr("height", y.bandwidth())
        .attr("fill", d => colorScale(d.count))
        .on("click", (event, d) => {
            // On clicking a cell, filter by that course and condition
            if (filterCourse && filterConditionCategory 
                && filterCourse === d.course && filterConditionCategory === d.condition) {
                // If same cell already selected, toggle off
                filterCourse = null;
                filterConditionCategory = null;
            } else {
                filterCourse = d.course;
                filterConditionCategory = d.condition;
            }
            applyFilters();
        })
        .on("mouseover", (event, d) => {
            // Show tooltip with exact count and percentage within that course
            const totalInCourse = grouped[d.course] ? Object.values(grouped[d.course]).reduce((a, b) => a + b, 0) : 0;
            const pct = totalInCourse ? ((d.count / totalInCourse) * 100).toFixed(1) : "0.0";
            showTooltip(`${d.course} & ${d.condition}: ${d.count} students (${pct}%)`, event.pageX, event.pageY);
        })
        .on("mouseout", hideTooltip);
    // Color legend for count
    const legendWidth = 20, legendHeight = 100;
    const legendSvg = svg.append("g")
        .attr("transform", `translate(${width + 40}, 10)`);
    // Gradient definition for legend
    const legendDef = svg.append("defs").append("linearGradient")
        .attr("id", "heatGradient");
    legendDef.append("stop")
        .attr("offset", "0%")
        .attr("stop-color", d3.interpolateBlues(0));
    legendDef.append("stop")
        .attr("offset", "100%")
        .attr("stop-color", d3.interpolateBlues(1));
    // Legend rectangle with gradient
    legendSvg.append("rect")
        .attr("width", legendWidth)
        .attr("height", legendHeight)
        .style("fill", "url(#heatGradient)");
    // Legend axis (count scale)
    const legendScale = d3.scaleLinear().domain([0, maxCount || 0]).range([legendHeight, 0]);
    legendSvg.append("g")
        .attr("transform", `translate(${legendWidth}, 0)`)
        .call(d3.axisRight(legendScale).ticks(5));
    // Legend label
    legendSvg.append("text")
        .attr("x", 0)
        .attr("y", legendHeight + 20)
        .attr("text-anchor", "start")
        .attr("font-weight", "bold")
        .text("Student Count");
}

// Draw Parallel Coordinates Plot (Multi-Variable Exploration)
function drawParallelCoordinates(data) {
    // Dimensions and margins
    const margin = { top: 50, right: 50, bottom: 20, left: 50 },
          width = 800 - margin.left - margin.right,
          height = 400 - margin.top - margin.bottom;
    // Create SVG container
    const svg = d3.select("#parallelCoords").append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);
    // Title
    svg.append("text")
        .attr("x", width / 2)
        .attr("y", -10)
        .attr("text-anchor", "middle")
        .attr("font-weight", "bold")
        .text("Parallel Coordinates: Multi-Variable Exploration");
    // Define dimensions (axes) for parallel plot
    const dimensions = [
        { name: "Gender", scale: d3.scalePoint().domain(["Female", "Male"]).range([height, 0]) },
        { name: "Year", scale: d3.scaleLinear().domain([1, 4]).range([height, 0]) },
        { name: "CGPA", scale: d3.scaleLinear().domain([0, 4]).range([height, 0]) },
        { name: "Depression", scale: d3.scalePoint().domain(["No", "Yes"]).range([height, 0]) },
        { name: "Anxiety", scale: d3.scalePoint().domain(["No", "Yes"]).range([height, 0]) },
        { name: "Panic", scale: d3.scalePoint().domain(["No", "Yes"]).range([height, 0]) },
        { name: "Treatment", scale: d3.scalePoint().domain(["No", "Yes"]).range([height, 0]) }
    ];
    // X scale for axes placement
    const xScale = d3.scalePoint()
        .domain(dimensions.map(d => d.name))
        .range([0, width]);
    // Draw each axis
    dimensions.forEach(dim => {
        const axisGroup = svg.append("g")
            .attr("class", "axis")
            .attr("transform", `translate(${xScale(dim.name)}, 0)`);
        axisGroup.call(d3.axisLeft(dim.scale));
        // Axis label
        axisGroup.append("text")
            .attr("y", -15)
            .attr("text-anchor", "middle")
            .attr("font-weight", "bold")
            .text(dim.name);
        // Add brushing for numeric axes (Year, CGPA)
        if (dim.scale.invert) {
            const brush = d3.brushY()
                .extent([[-10, 0], [10, height]])
                .on("end", event => {
                    if (!event.selection) {
                        // Brush cleared
                        if (dim.name === "Year") filterYearRange = null;
                        if (dim.name === "CGPA") filterCgpaRange = null;
                    } else {
                        const [y0, y1] = event.selection;
                        const yScale = dim.scale;
                        let domainLow = yScale.invert(y1);
                        let domainHigh = yScale.invert(y0);
                        // Normalize range
                        if (domainLow > domainHigh) {
                            [domainLow, domainHigh] = [domainHigh, domainLow];
                        }
                        if (dim.name === "Year") {
                            filterYearRange = [domainLow, domainHigh];
                        }
                        if (dim.name === "CGPA") {
                            filterCgpaRange = [domainLow, domainHigh];
                        }
                    }
                    applyFilters();
                });
            axisGroup.append("g")
                .attr("class", "brush")
                .call(brush);
        }
    });
    // Draw lines for each student
    const line = d3.line();
    svg.selectAll("path.line")
        .data(data)
        .enter().append("path")
        .attr("class", "line")
        .attr("fill", "none")
        .attr("stroke", d => colorScaleCond(d.conditionCategory))
        .attr("stroke-width", 1.5)
        .attr("opacity", 0.7)
        .attr("d", d => line(dimensions.map(dim => {
            let val;
            switch (dim.name) {
                case "Gender": val = d.gender; break;
                case "Year": val = d.year; break;
                case "CGPA": val = d.cgpa; break;
                case "Depression": val = d.depression; break;
                case "Anxiety": val = d.anxiety; break;
                case "Panic": val = d.panic; break;
                case "Treatment": val = d.treatment; break;
            }
            return [xScale(dim.name), dim.scale(val)];
        })));
}

// Draw Sankey Diagram (Condition -> Treatment Flow)
function drawSankeyDiagram(data) {
    // Dimensions and margins
    const margin = { top: 50, right: 50, bottom: 20, left: 50 },
          width = 600 - margin.left - margin.right,
          height = 400 - margin.top - margin.bottom;
    // Create SVG container
    const svg = d3.select("#sankeyChart").append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom);
    const g = svg.append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);
    // Title
    g.append("text")
        .attr("x", width / 2)
        .attr("y", -10)
        .attr("text-anchor", "middle")
        .attr("font-weight", "bold")
        .text("Conditions vs Treatment Seeking");
    // Prepare nodes and links data
    const condSet = new Set(data.map(d => d.conditionCategory));
    // Determine outcomes present in data
    let yesCount = 0, noCount = 0;
    data.forEach(d => { d.treatment === "Yes" ? yesCount++ : noCount++; });
    const outcomes = [];
    if (noCount > 0) outcomes.push("No");
    if (yesCount > 0) outcomes.push("Yes");
    // Build nodes array
    const nodes = [];
    condCategories.forEach(cat => {
        if (condSet.has(cat)) {
            nodes.push({ name: cat, type: "condition" });
        }
    });
    outcomes.forEach(out => {
        nodes.push({ name: out, type: "outcome" });
    });
    // Map node name to index
    const nameToIndex = {};
    nodes.forEach((node, i) => { nameToIndex[node.name] = i; });
    // Aggregate flows from condition -> treatment
    const flowCounts = {};
    data.forEach(d => {
        const source = d.conditionCategory;
        const target = d.treatment === "Yes" ? "Yes" : "No";
        const key = source + "->" + target;
        flowCounts[key] = (flowCounts[key] || 0) + 1;
    });
    const links = [];
    for (const [key, count] of Object.entries(flowCounts)) {
        const [sourceName, targetName] = key.split("->");
        if (nameToIndex[sourceName] != null && nameToIndex[targetName] != null) {
            links.push({
                source: nameToIndex[sourceName],
                target: nameToIndex[targetName],
                value: count
            });
        }
    }
    // Configure sankey generator
    const sankeyGen = d3.sankey()
        .nodeWidth(15)
        .nodePadding(10)
        .extent([[0, 0], [width, height]]);
    const sankeyData = sankeyGen({
        nodes: nodes.map(d => Object.assign({}, d)),
        links: links.map(d => Object.assign({}, d))
    });
    // Draw links (flows)
    g.append("g").selectAll("path.link")
        .data(sankeyData.links)
        .enter().append("path")
        .attr("class", "link")
        .attr("d", d3.sankeyLinkHorizontal())
        .attr("stroke", d => d.source.type === "condition" ? colorScaleCond(d.source.name) : "#888")
        .attr("stroke-width", d => Math.max(1, d.width))
        .attr("fill", "none")
        .attr("opacity", 0.5)
        .on("mouseover", (event, d) => {
            showTooltip(`${d.source.name} ➞ ${d.target.name}: ${d.value} students`, event.pageX, event.pageY);
        })
        .on("mouseout", hideTooltip);
    // Draw nodes
    g.append("g").selectAll("rect.node")
        .data(sankeyData.nodes)
        .enter().append("rect")
        .attr("class", "node")
        .attr("x", d => d.x0)
        .attr("y", d => d.y0)
        .attr("width", d => d.x1 - d.x0)
        .attr("height", d => Math.max(1, d.y1 - d.y0))
        .attr("fill", d => {
            if (d.type === "condition") return colorScaleCond(d.name);
            if (d.name === "Yes") return "#4daf4a";
            if (d.name === "No") return "#e41a1c";
            return "#999";
        })
        .attr("stroke", "#000")
        .on("click", (event, d) => {
            if (d.type === "condition") {
                if (filterConditionCategory && filterConditionCategory === d.name) {
                    filterConditionCategory = null;
                    filterCourse = null;
                } else {
                    filterConditionCategory = d.name;
                    filterCourse = null;
                }
            } else if (d.type === "outcome") {
                if (filterTreatment && filterTreatment === d.name) {
                    filterTreatment = null;
                } else {
                    filterTreatment = d.name;
                }
            }
            applyFilters();
        })
        .on("mouseover", (event, d) => {
            if (d.type === "condition") {
                showTooltip(`${d.name}: ${d.value} students`, event.pageX, event.pageY);
            } else if (d.type === "outcome") {
                const label = d.name === "Yes" ? "Sought Treatment" : "No Treatment";
                showTooltip(`${label}: ${d.value} students`, event.pageX, event.pageY);
            }
        })
        .on("mouseout", hideTooltip);
    // Node labels
    g.append("g").selectAll("text.node-label")
        .data(sankeyData.nodes)
        .enter().append("text")
        .attr("class", "node-label")
        .attr("x", d => d.x0 < width / 2 ? d.x0 - 6 : d.x1 + 6)
        .attr("y", d => (d.y0 + d.y1) / 2)
        .attr("dy", "0.35em")
        .attr("text-anchor", d => d.x0 < width / 2 ? "end" : "start")
        .text(d => d.name);
    // Side annotations for context
    g.append("text")
        .attr("x", 0)
        .attr("y", -30)
        .attr("text-anchor", "start")
        .attr("font-weight", "bold")
        .text("Condition Category");
    g.append("text")
        .attr("x", width)
        .attr("y", -30)
        .attr("text-anchor", "end")
        .attr("font-weight", "bold")
        .text("Treatment Outcome");
}

// Update all charts with filtered data
function updateCharts(data) {
    // Clear existing charts
    d3.select("#donutChart").selectAll("svg").remove();
    d3.select("#heatmap").selectAll("svg").remove();
    d3.select("#parallelCoords").selectAll("svg").remove();
    d3.select("#sankeyChart").selectAll("svg").remove();
    // Draw each chart with current data
    drawDonutChart(data);
    drawHeatmap(data);
    drawParallelCoordinates(data);
    drawSankeyDiagram(data);
}

// Apply current filters to data and update charts
function applyFilters() {
    let filteredData = fullData;
    if (filterConditionCategory) {
        filteredData = filteredData.filter(d => d.conditionCategory === filterConditionCategory);
    }
    if (filterCourse) {
        filteredData = filteredData.filter(d => d.courseCategory === filterCourse);
    }
    if (filterTreatment) {
        filteredData = filteredData.filter(d => d.treatment === filterTreatment);
    }
    if (filterYearRange) {
        filteredData = filteredData.filter(d => {
            return d.year !== null && d.year >= filterYearRange[0] && d.year <= filterYearRange[1];
        });
    }
    if (filterCgpaRange) {
        filteredData = filteredData.filter(d => {
            return d.cgpa !== null && d.cgpa >= filterCgpaRange[0] && d.cgpa <= filterCgpaRange[1];
        });
    }
    updateCharts(filteredData);
}

// Load data and initialize charts
d3.csv("data/student_mental_health.csv").then(data => {
    // Parse and preprocess data
    data.forEach(d => {
        d.gender = d["Choose your gender"];
        d.age = d.Age ? +d.Age : null;
        // Parse year of study (as number 1-4)
        const yearStr = d["Your current year of Study"] || "";
        const yearNum = parseInt(yearStr.replace(/[^0-9]/g, ""));
        d.year = isNaN(yearNum) ? null : yearNum;
        // Parse CGPA (take midpoint of range or value)
        let cgpaVal = null;
        if (d["What is your CGPA?"]) {
            const cgpaStr = d["What is your CGPA?"].trim();
            if (cgpaStr.includes("-")) {
                const parts = cgpaStr.split("-").map(s => parseFloat(s));
                if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
                    cgpaVal = (parts[0] + parts[1]) / 2;
                }
            }
            if (cgpaVal === null && !isNaN(parseFloat(cgpaStr))) {
                cgpaVal = parseFloat(cgpaStr);
            }
        }
        d.cgpa = cgpaVal;
        d.marital = d["Marital status"];
        d.depression = d["Do you have Depression?"] || "No";
        d.anxiety = d["Do you have Anxiety?"] || "No";
        d.panic = d["Do you have Panic attack?"] || "No";
        d.treatment = d["Did you seek any specialist for a treatment?"] || "No";
        // Determine condition category based on responses
        let count = 0;
        if (d.depression === "Yes") count++;
        if (d.anxiety === "Yes") count++;
        if (d.panic === "Yes") count++;
        if (count === 0) {
            d.conditionCategory = "None";
        } else if (count === 1) {
            if (d.depression === "Yes" && d.anxiety === "No" && d.panic === "No") {
                d.conditionCategory = "Depression only";
            } else if (d.depression === "No" && d.anxiety === "Yes" && d.panic === "No") {
                d.conditionCategory = "Anxiety only";
            } else if (d.depression === "No" && d.anxiety === "No" && d.panic === "Yes") {
                d.conditionCategory = "Panic only";
            } else {
                d.conditionCategory = "None";
            }
        } else if (count === 2) {
            d.conditionCategory = "Two conditions";
        } else if (count === 3) {
            d.conditionCategory = "All three";
        }
        // Course category (use course field directly)
        d.courseCategory = d["What is your course?"] || "";
    });
    fullData = data;
    // Initial render with all data
    updateCharts(fullData);
});
