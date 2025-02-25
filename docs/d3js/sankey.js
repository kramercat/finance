// Definitions
nodeWidth = 60
nodePadding = 10
nodeFontSize = "15px"
nodeFontHeight = 15;
linkFontSize = "15px"
stripeWidth = 1
stripeSpacing = 10
stripeColor = "#f33"
legendIconWidth = 60
legendIconHeight = 30
legendFontSize = "15px"

// Function to create striped pattern
function createStripedPattern(defs, id, fillColor) {
  const pattern = defs.append("pattern")
    .attr("id", id)
    .attr("patternUnits", "userSpaceOnUse")
    .attr("width", stripeWidth)
    .attr("height", stripeSpacing)
    .attr("patternTransform", "rotate(45)");

  pattern.append("rect")
    .attr("width", stripeWidth)
    .attr("height", stripeSpacing)
    .attr("fill", fillColor);

  pattern.append("line")
    .attr("x1", 0)
    .attr("y1", 0)
    .attr("x2", stripeWidth)
    .attr("y2", 0)
    .attr("stroke", stripeColor)
    .attr("stroke-width", stripeWidth);
}

// Function to create the Sankey diagram
function createSankey(data) {

  // Select the container element (e.g., a div with ID 'sankey-container')
  const container = d3.select("#sankey");
  container.selectAll("svg").remove();
  const containerWidth = container.node().getBoundingClientRect().width;
  const boundingHeight = container.node().getBoundingClientRect().height;
  const containerHeight = Math.max(boundingHeight, 1000);

  // Create the Sankey diagram
  const svg = d3.select("#sankey").append("svg")
    .attr("width", containerWidth)
    .attr("height", containerHeight)
    .call(d3.zoom().on("zoom", function (event) {
      svgMouse.attr("transform", event.transform);
    }))
    .call(d3.drag().on("drag", function (event) {
      const dx = event.dx;
      const dy = event.dy;
      const currentTransform = d3.zoomTransform(svg.node());
      svg.call(d3.zoom().transform, d3.zoomIdentity.translate(currentTransform.x + dx, currentTransform.y + dy).scale(currentTransform.k));
    }));

  const svgMouse = svg.append("g")

  // Create a group element to hold the content and apply rotation
  // Note that all child elements are within this rotation, so child.y is reality.x and child.x is reality.y
  const svgInner = svgMouse.append("g")
    .attr("transform", `rotate(90) translate(0, ${-containerWidth})`);

  // Set up the Sankey diagram layout
  const sankey = d3.sankey()
    .nodeWidth(nodeWidth)
    .nodePadding(nodePadding)
    .nodeAlign(d => d.level)
    .extent([[0, 0], [containerHeight, containerWidth]])
    .nodeSort((a, b) => a.order - b.order);

  // Create a map of node indices and colors
  const nodeMap = {};
  const nodeColorLookup = {};
  data.nodes.forEach((node, i) => {
    nodeMap[node.id] = i;
    nodeColorLookup[node.id] = node.fill;
  });

  // Convert link source and target names to indices
  const graph = sankey({
    nodes: data.nodes.map(d => Object.assign({
      id: nodeMap[d.id],
      displayName: d.displayName,
      fill: d.fill,
      stroke: d.stroke || d3.color(d.fill).darker(1),
      strokeWidth: d.strokeWidth || .5,
      value: d.value || 0
    }, d)),
    links: data.links.map(d => ({
      source: nodeMap[d.source],
      target: nodeMap[d.target],
      value: d.value || 0,
      linkOpacity: .4
    }))
  });

  // Add links (flows)
  svgInner.append("g")
    .selectAll(".link")
    .data(graph.links)
    .enter().append("path")
    .attr("class", "link")
    .attr("d", d3.sankeyLinkHorizontal())
    .style("stroke-width", d => Math.max(1, d.width))
    .style("stroke-opacity", d => d.linkOpacity)
    .style("stroke", d => `url(#gradient-${d.source.id}-${d.target.id})`)
    .style("fill", "none");

  var defs = svgInner.append("defs");
  var gradient = defs
    .selectAll(".gradient")
    .data(graph.links)
    .enter().append("linearGradient")
    .attr("id", d => `gradient-${d.source.id}-${d.target.id}`)
    .attr("x1", "0%")
    .attr("x2", "100%")
    .attr("y1", "0%")
    .attr("y2", "0%");
  gradient.append("stop")
    .attr("class", "start")
    .attr("offset", "0%")
    .attr("stop-color", d => nodeColorLookup[d.source.id])
    .attr("stop-opacity", 1);
  gradient.append("stop")
    .attr("class", "end")
    .attr("offset", "100%")
    .attr("stop-color", d => nodeColorLookup[d.target.id])
    .attr("stop-opacity", 1);

  // Add link values
  function centerVertical(d) {
    return (d.y0 || 0) + ((d.y1 || 0) - (d.y0 || 0)) / 2;
  }
  svgInner.append("g")
    .selectAll(".link-value")
    .data(graph.links)
    .enter().append("text")
    .attr("class", "link-value")
    .attr("x", d => -centerVertical(d))
    .attr("y", d => (d.source.x1 + d.target.x0) / 2)
    .attr("transform", "rotate(-90)")
    .attr("dy", ".35em")
    .style("text-anchor", "middle")
    .style("font-size", linkFontSize)
    .style("fill", d => d3.color(nodeColorLookup[d.target.id]).darker(1))
    .style("background-color", "white")
    .style("font-weight", "bold")
    .text(d => numberToDollar(d.value));

  // Add nodes (elements)
  const node = svgInner.append("g")
    .selectAll(".node")
    .data(graph.nodes)
    .enter().append("g")
    .attr("class", "node")
    .attr("transform", d => `translate(${d.x0 || 0},${d.y0 || 0})`);

  // Add node rectangles
  node.append("rect")
    .attr("height", d => (d.y1 || 0) - (d.y0 || 0))
    .attr("width", sankey.nodeWidth())
    .style("fill", d => {
      if (d.pattern === "striped") {
        return `url(#pattern-${d.id})`;
      }
      return d.fill;
    })
    .style("stroke", d => d.stroke)
    .style("stroke-width", d => d.strokeWidth);

  // Striped node definition
  const nodePatterns = svgInner.append("defs")
    .selectAll(".node-pattern")
    .data(graph.nodes.filter(d => d.pattern === "striped"))
    .enter().append("pattern")
    .each(function (d) {
      createStripedPattern(d3.select(this), `pattern-${d.id}`, d.fill);
    });

  // Add node names
  node.append("text")
    .attr("x", d => ((d.y0 || 0) - (d.y1 || 0)) / 2)  // Center the text vertically
    .attr("y", sankey.nodeWidth() / 2)
    .attr("dy", ".35em")
    .attr("transform", "rotate(-90)")
    .style("text-anchor", "middle")
    .style("font-weight", "bold")
    .each(function (d) {
      const labelText = d.displayName;
      const valueText = d.value ? numberToDollar(d.value) : '';
      const fullText = labelText + " " + valueText;
      wrapText(d3.select(this), fullText, d.value / 180);  // Wrap the text
    });

  // Function to wrap text into multiple lines based on maxWidth
  function wrapText(textElement, text, maxWidth, font = nodeFontSize) {
    const words = text.split(' ');
    let currentLine = '';
    const lines = [];

    // Measure text width for wrapping
    const measureWidth = (line) => textElement.style("font", font).text(line).node().getBBox().width;

    words.forEach(word => {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      if (measureWidth(testLine) > maxWidth || word.startsWith("$")) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    });

    lines.push(currentLine);  // Add the last line

    // Set the text content with wrapping
    textElement.text(null);
    const numLines = lines.length;
    lines.forEach((line, i) => {
      textElement.append("tspan")
        .attr("x", textElement.attr("x"))
        .attr("y", parseFloat(textElement.attr("y")) + (i - numLines / 2 + 0.5) * nodeFontHeight)
        .style("font", font)
        .text(line);
    });
  }
}

// Function to calculate taxes based on income and tax brackets
function calculateTaxes(income) {
  const brackets = [
    { rate: 0.10, threshold: 11600 },
    { rate: 0.12, threshold: 47150 },
    { rate: 0.22, threshold: 100525 },
    { rate: 0.24, threshold: 191950 },
    { rate: 0.32, threshold: 243725 },
    { rate: 0.35, threshold: 609350 },
    { rate: 0.37, threshold: Infinity }
  ];

  let taxes = 0;
  let previousThreshold = 0;

  for (const bracket of brackets) {
    if (income > bracket.threshold) {
      taxes += (bracket.threshold - previousThreshold) * bracket.rate;
      previousThreshold = bracket.threshold;
    } else {
      taxes += (income - previousThreshold) * bracket.rate;
      break;
    }
  }

  return taxes;
}

// Function to update the Sankey diagram with custom values
function updateSankey() {
  // Income & pretax elections
  const incomeAmount = +document.getElementById("income-amount").value;
  const taxDeductions = +document.getElementById("tax-deductions").value;
  const contribution401kPreTax = +document.getElementById("401k-contributions-pretax").value;
  // Tax calculations
  const taxableIncome = incomeAmount - taxDeductions - contribution401kPreTax;
  const taxes = calculateTaxes(taxableIncome);
  // Calculate and show effective tax rate
  const taxRateEffective = taxes / taxableIncome;
  document.getElementById("tax-rate").value = (taxRateEffective * 100).toFixed(2) + "%";

  // Employer match
  const contibution401kEmployer = +document.getElementById("401k-contributions-employer").value;
  // Post tax elections
  const contribution401kPostTax = +document.getElementById("401k-contributions-posttax").value;
  const ira = +document.getElementById("ira-traditional").value;
  // Net income
  const netIncome = taxableIncome - taxes;
  const remainingIncome = netIncome - contribution401kPostTax - ira;

  // Retirement calculations
  const funds401k = contribution401kPreTax + contibution401kEmployer;
  const fundsRoth = contribution401kPostTax + ira;

  d3.json("sankey.json").then(data => {
    // Update the income-related values
    data.links.forEach(link => {
      // Intake settings
      if (link.source === "income") {
        if (link.target === "tax-deductions") {
          link.value = taxDeductions;
        } else if (link.target === "401k-contributions-pretax") {
          link.value = contribution401kPreTax;
        } else if (link.target === "income-taxable") {
          link.value = taxableIncome;
        }
      }
      // IRA stuff
      if (link.target === "ira-traditional") {
        link.value = ira;
      }
      if (link.target === "ira-roth") {
        link.value = ira;
      }
      // Calculate net income
      if (link.source === "income-taxable") {
        if (link.target === "taxes") {
          link.value = taxes;
        } else if (link.target === "income-net") {
          link.value = netIncome;
        }
      }
      // Calculate spending categories
      if (link.source === "income-net") {
        if (link.target === "401k-contributions-posttax") {
          link.value = contribution401kPostTax;
        } else if (link.target === "spending-needs") {
          link.value = remainingIncome * 0.5;
        } else if (link.target === "spending-wants") {
          link.value = remainingIncome * 0.3;
        } else if (link.target === "spending-savings") {
          link.value = remainingIncome * 0.2;
        }
      }
      // Calculate total 401k contributions
      if (link.source === "401k-contributions-employer") {
        link.value = contibution401kEmployer;
      }
      if (link.target === "401k-contributions") {
        if (link.source === "401k-contributions-pretax") {
          link.value = contribution401kPreTax;
        } else if (link.source === "401k-contributions-posttax") {
          link.value = contribution401kPostTax;
        }
      }
      // 401k Funds
      if (link.target === "funds-401k") {
        link.value = funds401k;
      }
      // IRA Funds
      if (link.target === "funds-roth") {
        if (link.source === "ira-roth") {
          link.value = ira;
        } else if (link.source === "401k-contributions") {
          link.value = contribution401kPostTax;
        }
      }
      // Retirement Funds
      if (link.target === "funds-retirement") {
        if (link.source === "funds-401k") {
          link.value = funds401k;
        } else if (link.source === "funds-roth") {
          link.value = fundsRoth;
        }
      }
      if (link.target === "funds-retirement-tax-exempt") {
        link.value = fundsRoth;
      } else if (link.target === "funds-retirement-taxable") {
        link.value = funds401k;
      }
    });

    createSankey(data);
  });
}

function numberToDollar(num) {
  return `$${num.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

// Add an event listener to enable dragging and resizing
d3.select("#sankey").call(d3.drag().on("drag", function (event) {
  const dx = event.dx;
  const dy = event.dy;
  const currentTransform = d3.zoomTransform(d3.select("#sankey svg").node());
  d3.select("#sankey svg").call(d3.zoom().transform, d3.zoomIdentity.translate(currentTransform.x + dx, currentTransform.y + dy).scale(currentTransform.k));
}));

// Add a button to reset the SVG interactivity
const resetButton = document.createElement("button");
resetButton.innerText = "Reset Interactivity";
resetButton.addEventListener("click", () => {
  const svg = d3.select("#sankey svg");
  svg.call(d3.zoom().transform, d3.zoomIdentity);
  svg.select("g").attr("transform", "translate(0,0) scale(1)");
});
document.body.insertBefore(resetButton, document.getElementById("sankey-controls"));

// Add a legend to indicate that the red strip node patterns indicate that the node is taxable
function addLegend() {
  const legend = d3.select("#sankey-controls").append("svg")
    .attr("width", 200)
    .attr("height", 50)
    .append("g")
    .attr("transform", "translate(10,10)");

  // Add a striped pattern to the legend
  legend.append("rect")
    .attr("width", legendIconWidth)
    .attr("height", legendIconHeight)
    .attr("stroke", "#999")
    .attr("transform", `translate(${legendIconWidth}, 0) scale(-1, 1)`)
    .style("fill", "url(#legend-pattern)");

  // Define the striped pattern for the legend
  const defs = legend.append("defs");
  createStripedPattern(defs, "legend-pattern", "#ddd");

  // Add text to the legend
  legend.append("text")
    .attr("x", legendIconWidth + 10)
    .attr("y", legendIconHeight * 2 / 3)
    .style("font-size", legendFontSize)
    .text("Taxable");
}

// Function to load data and create/update the Sankey diagram
function loadAndCreateSankey() {
  d3.json("sankey.json").then(data => {
    updateSankey();
    createSankey(data);
  });
}

// Load the data and create the Sankey diagram initially
loadAndCreateSankey();
addLegend();

// Add an event listener to resize the diagram when the window is resized
window.addEventListener("resize", loadAndCreateSankey);