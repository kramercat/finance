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
    .nodeWidth(20)
    .nodePadding(10)
    .nodeAlign(d3.sankeyRight)
    .extent([[10, 1], [width - 200, height - 2]])
    //.nodeSort((a, b) => a.displayName.localeCompare(b.displayName));  // Sort nodes to minimize crossings
    .nodeSort((a, b) => sortLinks(a, b));

  function sortLinks(a, b) {
    if (a.top) {
      return -1;
    } else if (b.top) {
      return 1;
    } else if (
      a.sourceLinks.length == 0 &&
      b.sourceLinks.length > 0
    ) {
      return 1;
    } else if (
      b.sourceLinks.length == 0 &&
      a.sourceLinks.length > 0
    ) {
      return -1;
    } else if (
      a.targetLinks.length == 0 &&
      b.targetLinks.length > 0
    ) {
      return -1;
    } else if (
      b.targetLinks.length == 0 &&
      a.targetLinks.length > 0
    ) {
      return 1;
    } else {
      return a.displayName - b.displayName;
    }
  }

  // Create a map to convert node names to indices
  const nodeMap = {};
  data.nodes.forEach((node, i) => {
    nodeMap[node.id] = i;
  });

  // Convert link source and target names to indices
  const graph = sankey({
    nodes: data.nodes.map(d => Object.assign({}, d)),
    links: data.links.map(d => ({
      source: nodeMap[d.source],
      target: nodeMap[d.target],
      value: d.value || 0,  // Default to 0 if value is not provided
      linkFill: d.linkFill,
      linkStroke: d.linkStroke,
      linkOpacity: d.linkOpacity
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
    .style("fill", d => d.linkFill || "none")
    .style("stroke", d => d.linkStroke || "#000")
    .style("stroke-opacity", d => d.linkOpacity || 0.4);

  // Add link values
  // svg.append("g")
  //   .selectAll(".link-value")
  //   .data(graph.links)
  //   .enter().append("text")
  //   .attr("class", "link-value")
  //   .attr("x", d => (d.source.x1 + d.target.x0) / 2)
  //   .attr("y", d => (d.source.y1 + d.target.y0) / 2)
  //   .attr("dy", ".35em")
  //   .style("text-anchor", "middle")
  //   .text(d => `$${d.value.toLocaleString()}`);

  // Add nodes (elements)
  const node = svg.append("g")
    .selectAll(".node")
    .data(graph.nodes)
    .enter().append("g")
    .attr("class", "node")
    .attr("transform", d => `translate(${d.x0},${d.y0})`);

  // Add node rectangles
  node.append("rect")
    .attr("height", d => d.y1 - d.y0)
    .attr("width", sankey.nodeWidth())
    .style("fill", d => d.rectfill || "#ccc")
    .style("stroke", d => d.rectstroke || "#000")
    .style("stroke-width", 1);

  // Add node names
  const textOffset = sankey.nodeWidth() + 10
  node.append("text")
    .attr("x", textOffset)  // Add some padding to the left
    .attr("y", d => (d.y1 - d.y0) / 2)
    .attr("dy", ".35em")
    .style("text-anchor", "start")
    .text(d => d.displayName)

  // Add node values
  node.append("text")
    .attr("x", textOffset)  // Add some padding to the left
    .attr("y", d => (d.y1 - d.y0) / 2 + 20)  // Position below the node name
    .attr("dy", ".35em")
    .style("text-anchor", "start")
    .text(d => d.value ? `$${d.value.toLocaleString()}` : '');
}

// Function to update the Sankey diagram with custom values
function updateSankey() {
  const paycheckAmount = +document.getElementById("paycheck-amount").value;
  const preTaxContribution = +document.getElementById("401k-contributions-pretax").value;
  const employerMatch = +document.getElementById("401k-contributions-employer").value;
  const postTaxContribution = +document.getElementById("401k-contributions-posttax").value;
  const ira = +document.getElementById("ira-traditional").value;
  const taxes = +document.getElementById("taxes").value;
  const postTaxPay = paycheckAmount - preTaxContribution - taxes

  d3.json("sankey.json").then(data => {
    // Update the paycheck-related values
    data.links.forEach(link => {
      // Intake settings
      if (link.source === "401k-contributions-employer") {
        link.value = employerMatch;
      }
      if (link.source === "paycheck") {
        if (link.target === "401k-contributions-pretax") {
          link.value = preTaxContribution;
        } else if (link.target === "taxes") {
          link.value = taxes;
        } else if (link.target === "paycheck-posttax") {
          link.value = postTaxPay;
        }
      }
      // IRA stuff
      if (link.target === "ira-traditional") {
        link.value = ira;
      }
      if (link.target === "ira-roth") {
        link.value = ira;
      }
      // Calculate remaining paycheck
      if (link.source === "paycheck-posttax") {
        if (link.target === "401k-contributions-posttax") {
          link.value = postTaxContribution;
        } else if (link.target === "checking") {
          link.value = postTaxPay - postTaxContribution - ira;
        }
      }
      // Calculate total 401k contributions
      if (link.target === "401k-contributions") {
        if (link.source === "401k-contributions-pretax") {
          link.value = preTaxContribution;
        } else if (link.source === "401k-contributions-posttax") {
          link.value = postTaxContribution;
        }
      }
      // 401k Funds
      if (link.target === "funds-401k") {
        link.value = preTaxContribution + employerMatch;
      }
      // IRA Funds
      if (link.target === "funds-roth") {
        if (link.source === "ira-roth") {
          link.value = ira;
        } else if (link.source === "401k-contributions") {
          link.value = postTaxContribution;
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