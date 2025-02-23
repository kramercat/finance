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
    .extent([[10, 20], [width - 100, height - 2]])
    .nodeSort((a, b) => sortLinks(a, b));

  function sortLinks(a, b) {
    if (a.top) {
      return -1;
    } else if (b.top) {
      return 1;
    } else if (
      a.sourceLinks.length == 0 && b.sourceLinks.length > 0
    ) {
      return 1;
    } else if (
      b.sourceLinks.length == 0 && a.sourceLinks.length > 0
    ) {
      return -1;
    } else if (
      a.targetLinks.length == 0 && b.targetLinks.length > 0
    ) {
      return -1;
    } else if (
      b.targetLinks.length == 0 && a.targetLinks.length > 0
    ) {
      return 1;
    } else {
      return a.displayName - b.displayName;
    }
  }

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
  svg.append("g")
    .selectAll(".link")
    .data(graph.links)
    .enter().append("path")
    .attr("class", "link")
    .attr("d", d3.sankeyLinkHorizontal())
    .style("stroke-width", d => Math.max(1, d.width))
    .style("fill", "none")
    //.style("stroke", d => nodeColorLookup[d.target.id] || "#000")  // Use source node color
    .style("stroke-opacity", d => d.linkOpacity)
    .style("stroke", d => `url(#gradient-${d.source.id}-${d.target.id})`)
    //.style("stroke", "url(#svgGradient)")
    ;

  var defs = svg.append("defs");
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
    .style("fill", d => d.fill)
    .style("stroke", d => d.stroke)
    .style("stroke-width", d => d.strokeWidth);

  // Add node names
  const textOffset = sankey.nodeWidth() + 10
  node.append("text")
    .attr("x", textOffset)  // Add some padding to the left
    .attr("y", d => (d.y1 - d.y0) / 2)
    .attr("dy", ".35em")
    .style("text-anchor", "start")
    .each(function (d) {
      const labelText = d.displayName;
      const valueText = d.value ? `$${d.value.toLocaleString()}` : '';
      const fullText = labelText + " " + valueText;
      wrapText(d3.select(this), fullText);  // Use wrapText to handle the actual wrapping
    });

  // Function to wrap text into multiple lines based on a maxWidth
  function wrapText(
    textElement, text,
    maxWidth = 100,
    font = "11px sans-serif",
    lineHeight = 20
  ) {
    // Break the text into lines
    const lines = breakTextIntoLines(text, maxWidth, font);

    // Remove the original text content
    textElement.text(null);

    // Add each line as a tspan, adjusting the vertical position
    // Vertically center the text based on the number of lines
    const numLines = lines.length;
    lines.forEach((line, index) => {
      textElement.append("tspan")
        .attr("x", textElement.attr("x"))  // Keep the same x position
        .attr("y", parseFloat(textElement.attr("y")) + (index - numLines / 2 + 0.5) * lineHeight)  // Adjust the y position
        .style("font", font)  // Apply the font style
        .text(line);  // Display the line
    });
  }

  // Function to break text into lines (same as the earlier example)
  function breakTextIntoLines(text, maxWidth, font) {
    // Split the text into words
    const words = text.split(' ');
    const lines = [];
    let currentLine = '';

    const testLine = (line) => {
      // Test the line width
      const textWidth = svg.append("text").style("font", font).text(line).node().getBBox().width;
      return textWidth <= maxWidth;
    };

    words.forEach(word => {
      // Test the line with the new word
      const testLineResult = testLine(currentLine + (currentLine ? ' ' : '') + word);

      // Test for wrapping
      if (word.startsWith("$")) {
        // Always newline if the word starts with a dollar sign
        lines.push(currentLine);
        currentLine = word;
      } else if (testLineResult) {
        // Add the word to the current line if it fits
        currentLine = currentLine ? currentLine + ' ' + word : word;
      } else {
        // Start a new line if the word doesn't fit
        lines.push(currentLine);
        currentLine = word;
      }
    });

    // Add the last line
    lines.push(currentLine);
    return lines;
  }
}

// Function to update the Sankey diagram with custom values
function updateSankey() {
  const paycheckAmount = +document.getElementById("paycheck-amount").value;
  const preTaxContribution = +document.getElementById("401k-contributions-pretax").value;
  const employerMatch = +document.getElementById("401k-contributions-employer").value;
  const postTaxContribution = +document.getElementById("401k-contributions-posttax").value;
  const ira = +document.getElementById("ira-traditional").value;
  const taxes = +document.getElementById("taxes").value;
  const postTaxPay = paycheckAmount - preTaxContribution - taxes;
  const spending = postTaxPay - postTaxContribution - ira;

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
      // Calculate remaining spending
      if (link.source === "paycheck-posttax") {
        if (link.target === "401k-contributions-posttax") {
          link.value = postTaxContribution;
        } else if (link.target === "spending") {
          link.value = spending;
        }
      }
      // Calculate spending categories
      if (link.source === "spending") {
        if (link.target === "spending-needs") {
          link.value = spending * 0.5;
        } else if (link.target === "spending-wants") {
          link.value = spending * 0.3;
        } else if (link.target === "spending-savings") {
          link.value = spending * 0.2;
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
      // Retirement Funds
      if (link.target === "funds-retirement") {
        if (link.source === "funds-401k") {
          link.value = preTaxContribution + employerMatch;
        } else if (link.source === "funds-roth") {
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

