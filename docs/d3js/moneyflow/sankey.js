import { wrapText, createStripedPattern, numberToDollar, calculateTaxes, updateDisplayValues } from './utils.js';

// Definitions
const nodeWidth = 60
const nodePadding = 20

const linkFontSize = "15px"

const legendIconWidth = 60
const legendIconHeight = 30
const legendFontSize = "15px"

// Limits
const contribution401kMax = 70000;

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
}

// Function to update the Sankey diagram with custom values
function updateSankey() {
  // Income
  const incomeAmount = +document.getElementById("income-amount").value;
  // 401k pretax elections
  let contribution401kPreTax = +document.getElementById("401k-contributions-pretax").value;
  // Tax deductions
  let taxDeductions = +document.getElementById("tax-deductions").value;

  // Pretax limiters
  if (incomeAmount > document.getElementById("401k-contributions-pretax").max) {
    document.getElementById("401k-contributions-pretax").max = incomeAmount;
  }
  if (document.getElementById("401k-contributions-pretax").max > 23500) {
    document.getElementById("401k-contributions-pretax").max = 23500;
  }
  if (contribution401kPreTax > incomeAmount) {
    contribution401kPreTax = incomeAmount;
    document.getElementById("401k-contributions-pretax").max = contribution401kPreTax;
    document.getElementById("401k-contributions-pretax").value = contribution401kPreTax;
  }
  if (incomeAmount > document.getElementById("tax-deductions").max) {
    document.getElementById("tax-deductions").max = incomeAmount;
  }
  if (taxDeductions > incomeAmount - contribution401kPreTax) {
    taxDeductions = incomeAmount - contribution401kPreTax;
    document.getElementById("tax-deductions").max = taxDeductions;
    document.getElementById("tax-deductions").value = taxDeductions;
  }

  // Tax calculations
  const incomeCalcText = numberToDollar(incomeAmount) + " - " + numberToDollar(contribution401kPreTax) + " - " + numberToDollar(taxDeductions);
  document.getElementById("income-calc").value = incomeCalcText;
  const taxableIncome = incomeAmount - taxDeductions - contribution401kPreTax;
  document.getElementById("taxable-income").value = "$" + taxableIncome;

  // Calculate and show effective tax rate
  const taxes = calculateTaxes(taxableIncome);
  document.getElementById("tax-paid").value = numberToDollar(taxes);
  let taxRateEffective = 0;
  if (taxableIncome === 0) {
    taxRateEffective = 1;
  } else {
    taxRateEffective = taxes / taxableIncome;
  }
  document.getElementById("tax-rate").value = (taxRateEffective * 100).toFixed(2) + "%";

  // Net income
  const netIncome = taxableIncome - taxes;
  document.getElementById("net-income").value = numberToDollar(netIncome);

  // 401k Employer match
  const contribution401kMaxEmployer = contribution401kMax - contribution401kPreTax;
  // 401k Set slider max
  document.getElementById("401k-contributions-employer").max = contribution401kMaxEmployer;
  if (document.getElementById("401k-contributions-employer").max > contribution401kMaxEmployer) {
    document.getElementById("401k-contributions-employer").max = contribution401kMaxEmployer;
  }
  // 401k Limit to max employer match
  let contribution401kEmployer = +document.getElementById("401k-contributions-employer").value;
  if (contribution401kEmployer > contribution401kMaxEmployer) {
    contribution401kEmployer = contribution401kMaxEmployer;
    document.getElementById("401k-contributions-employer").value = contribution401kEmployer;
  }
  // 401k Post tax elections
  const contribution401kMaxPostTax = contribution401kMaxEmployer - contribution401kEmployer;
  // 401k Set slider max
  document.getElementById("401k-contributions-posttax").max = contribution401kMaxPostTax;
  if (document.getElementById("401k-contributions-posttax").max > netIncome) {
    document.getElementById("401k-contributions-posttax").max = netIncome;
  }
  // 401k Limit to max post-tax
  let contribution401kPostTax = +document.getElementById("401k-contributions-posttax").value;
  if (contribution401kPostTax > contribution401kMaxPostTax) {
    contribution401kPostTax = contribution401kMaxPostTax;
    document.getElementById("401k-contributions-posttax").value = contribution401kPostTax;
  }
  // Show total 401k contributions
  const total401k = contribution401kPreTax + contribution401kEmployer + contribution401kPostTax;
  let total401kText = numberToDollar(total401k)
  if (total401k === contribution401kMax) {
    total401kText += " (max)";
  }
  document.getElementById("total-401k").value = total401kText;
  // Show after post 401k post tax
  document.getElementById("after-401k-posttax").value = numberToDollar(netIncome - contribution401kPostTax);

  // IRA
  const iraMax = Math.min(7000, netIncome - contribution401kPostTax);
  // IRA Set slider max
  document.getElementById("ira-traditional").max = iraMax;
  if (document.getElementById("ira-traditional").max > netIncome) {
    document.getElementById("ira-traditional").max = netIncome;
  }
  // IRA Limit to max post-tax
  let ira = +document.getElementById("ira-traditional").value;
  if (ira > iraMax) {
    ira = iraMax;
    document.getElementById("ira-traditional").value = ira;
  }

  // Remaining income
  const remainingIncome = netIncome - contribution401kPostTax - ira;
  document.getElementById("remaining-income").value = numberToDollar(remainingIncome);

  // Update the display values
  updateDisplayValues();

  // Retirement calculations
  const funds401k = contribution401kPreTax + contribution401kEmployer;
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
        link.value = contribution401kEmployer;
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

// Make the updateSankey function globally accessible
window.updateSankey = updateSankey;

// Add an event listener to enable dragging and resizing
d3.select("#sankey").call(d3.drag().on("drag", function (event) {
  const dx = event.dx;
  const dy = event.dy;
  const currentTransform = d3.zoomTransform(d3.select("#sankey svg").node());
  d3.select("#sankey svg").call(d3.zoom().transform, d3.zoomIdentity.translate(currentTransform.x + dx, currentTransform.y + dy).scale(currentTransform.k));
}));

// Add a button to reset the SVG interactivity
const resetButton = document.createElement("button");
resetButton.className = "btn waves-effect waves-light";
resetButton.innerText = "Reset View";
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