const cheerio = require("cheerio");

async function extractMatchInfo(page) {
  // root link
  const rootLink = "https://www.sportybet.com/ng/m/sport/football/";
  // Get the HTML content of the page
  const html = await page.content();
  // Load the HTML content into Cheerio
  const $ = cheerio.load(html);

  // Extract match info using Cheerio
  const matches = [];
  $('div[data-key^="sr:match:"]').each((index, element) => {
    const $element = $(element);
    const $labelPrematch = $element.find('div[data-op="label-prematch"]');

    if ($labelPrematch.length > 0) {
      // Extract league name
      let leagueName = $labelPrematch.find(".m-league-name").text().trim();
      // Split the league name using hyphen
      const leagueParts = leagueName
        .split("-")
        .map(part => part.trim().replace(/\s+/g, "_"));
      // Join league parts with slash
      leagueName = leagueParts.join("/");

      // Extract team names
      const team1 = $element
        .find(".m-info-cell .team")
        .eq(0)
        .text()
        .trim()
        .replace(/\s+/g, "_");
      const team2 = $element
        .find(".m-info-cell .team")
        .eq(1)
        .text()
        .trim()
        .replace(/\s+/g, "_");
      const teams = `${team1}_vs_${team2}`;

      // Extract data key attribute
      const dataKey = $element.attr("data-key");

      // Check if a match with the same data key already exists
      const existingMatch = matches.find(match => match.dataKey === dataKey);
      if (!existingMatch) {
        matches.push({
          leagueName,
          teams,
          dataKey,
          link: rootLink + leagueName + "/" + teams + "/" + dataKey
        });
      }
    }
  });

  return matches;
}

module.exports = extractMatchInfo;