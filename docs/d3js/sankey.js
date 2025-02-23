// Function to create the Sankey diagram
function createSankey(data) {
  // Remove any existing SVG
  d3.select("#sankey").selectAll("svg").remove();

  // Get the current window dimensions
  const width = window.innerWidth * 0.9;  // Use 90% of the window width
  const height = window.innerHeight * 0.8;  // Use 80% of the window height

  // Create the Sankey diagram
  const svg = d3.select("#sankey").append("svg")
    .attr("width", width)
    .attr("height", height);

  // Set up the Sankey diagram layout
  const sankey = d3.sankey()
    .nodeWidth(50)
    .nodePadding(40)
    .extent([[50, 1], [width - 50, height - 2]])
    .nodeSort((a, b) => a.name.localeCompare(b.name));  // Sort nodes to minimize crossings

  // Create a map to convert node names to indices
  const nodeMap = {};
  data.nodes.forEach((node, i) => {
    nodeMap[node.name] = i;
  });

  // Convert link source and target names to indices
  const graph = sankey({
    nodes: data.nodes.map(d => Object.assign({}, d)),
    links: data.links.map(d => ({
      source: nodeMap[d.source],
      target: nodeMap[d.target],
      value: d.value || 0,  // Default to 0 if value is not provided
      linkfill: d.linkfill,
      linkstroke: d.linkstroke,
      rectfill: d.rectfill,
      rectstroke: d.rectstroke
    }))
  });

  // Add links (flows)
  svg.append("g")
    .selectAll(".link")
    .data(graph.links)
    .enter().append("path")
    .attr("class", "link")
    .attr("d", d3.sankeyLinkHorizontal())
    .style("stroke-width", d => Math.max(1, d.width))
    .style("fill", d => d.linkfill || "none")
    .style("stroke", d => d.linkstroke || "#000")
    .style("stroke-opacity", 0.2);

  // Add link values
  svg.append("g")
    .selectAll(".link-value")
    .data(graph.links)
    .enter().append("text")
    .attr("class", "link-value")
    .attr("x", d => (d.source.x1 + d.target.x0) / 2)
    .attr("y", d => (d.source.y1 + d.target.y0) / 2)
    .attr("dy", ".35em")
    .style("text-anchor", "middle")
    .text(d => d.value.toLocaleString());

  // Add nodes (elements)
  const node = svg.append("g")
    .selectAll(".node")
    .data(graph.nodes)
    .enter().append("g")
    .attr("class", "node")
    .attr("transform", d => `translate(${d.x0},${d.y0})`);

  node.append("rect")
    .attr("height", d => d.y1 - d.y0)
    .attr("width", sankey.nodeWidth())
    .style("fill", d => d.rectfill || "#ccc")
    .style("stroke", d => d.rectstroke || "#000")
    .style("stroke-width", 1);

  node.append("text")
    .attr("x", 5)  // Add some padding to the left
    .attr("y", d => (d.y1 - d.y0) / 2)
    .attr("dy", ".35em")
    .style("text-anchor", "middle")
    .text(d => d.name)
    .each(function (d) {
      const textWidth = this.getBBox().width;
      d3.select(this.parentNode).select("rect")
        .attr("width", textWidth + 10)  // Set width of node based on text
        .attr("x", -textWidth / 2);  // But keep it centered
    });

  // Add node values
  node.append("text")
    .attr("x", 5)  // Add some padding to the left
    .attr("y", d => (d.y1 - d.y0) / 2 + 20)  // Position below the node name
    .attr("dy", ".35em")
    .style("text-anchor", "middle")
    .text(d => d.value ? d.value.toLocaleString() : '');
}

// Function to update the Sankey diagram with custom values
function updateSankey() {
  const paycheckAmount = +document.getElementById("paycheckAmount").value;
  const preTaxContribution = +document.getElementById("401kPreTaxContribution").value;
  const employerMatch = +document.getElementById("401kEmployerMatch").value;
  const taxes = +document.getElementById("taxes").value;
  const postTaxContribution = +document.getElementById("401kPostTaxContribution").value;
  const postTaxPay = paycheckAmount - preTaxContribution - taxes

  d3.json("sankey.json").then(data => {
    // Update the paycheck-related values
    data.links.forEach(link => {
      if (link.source === "401k Employer Match") {
        link.value = employerMatch;
      }
      if (link.source === "Paycheck") {
        if (link.target === "401k Pre-Tax Contributions") {
          link.value = preTaxContribution;
        } else if (link.target === "Taxes") {
          link.value = taxes;
        } else if (link.target === "Post-Tax Pay") {
          link.value = postTaxPay;
        }
      }
      if (link.source === "Post-Tax Pay") {
        if (link.target === "401k Post-Tax Contributions") {
          link.value = postTaxContribution;
        } else if (link.target === "Checking Account") {
          link.value = postTaxPay - postTaxContribution;
        }
      }
    });

    createSankey(data);
  });
}

// Load the data from the JSON file and create the Sankey diagram
d3.json("sankey.json").then(data => {
  updateSankey();
  createSankey(data);
});

// Add an event listener to resize the diagram when the window is resized
window.addEventListener("resize", () => {
  d3.json("sankey.json").then(data => {
    createSankey(data);
  });
});