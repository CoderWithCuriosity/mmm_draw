const puppeteer = require("puppeteer");
const cheerio = require("cheerio");
const fs = require("fs");

const gameLinks = [];

function delay(time) {
  return new Promise(function(resolve) {
    setTimeout(resolve, time);
  });
}

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

async function statistics(page) {
  // Define the scroll function
  const scrollUntilElementVisible = async () => {
    await page.evaluate(() => {
      window.scrollBy(0, 300); // Scroll down by 100 pixels
    });
    await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for 1 second for the page to settle
  };
  await scrollUntilElementVisible();
  try {
    // Wait for the DOM to load
    await page.waitForSelector(".sr-leaguepositionform__wrapper", {
      timeout: 10000
    });
    await page.waitForSelector(
      ".sr-procvaltext__component-value.sr-procvaltext__component-value-medium",
      { timeout: 10000 }
    );
    // Wait for the home selector
    await page.waitForSelector(".sr-last-matches.sr-last-matches--right", {
      timeout: 5000
    });
    // Wait for the away selector
    await page.waitForSelector(".sr-teamform__lastXTeam.srm-left", {
      timeout: 10000
    });

    // Extract home league position
    const homeLeaguePosition = await page.evaluate(() => {
      const homeElement = document.querySelector(
        ".sr-positionchart__wrapper.srt-base-1-home-1 .sr-positionchart__box-content"
      );
      return homeElement ? homeElement.textContent.trim() : null;
    });

    // Extract away league position
    const awayLeaguePosition = await page.evaluate(() => {
      const awayElement = document.querySelector(
        ".sr-positionchart__box-content.srt-away-1"
      );
      return awayElement ? awayElement.textContent.trim() : null;
    });

    // Extract home and away values
    const [homeValueElement, awayValueElement] = await page.$$(
      ".sr-procvaltext__component-value.sr-procvaltext__component-value-medium"
    );

    // Extract home and away form value
    const homeValue = await page.evaluate(
      homeValueElement => homeValueElement.textContent.trim(),
      homeValueElement
    );
    const awayValue = await page.evaluate(
      awayValueElement => awayValueElement.textContent.trim(),
      awayValueElement
    );

    // Extracting home team results
    const homeResults = await page.evaluate(() => {
      const homeMatches = document.querySelectorAll(
        ".sr-teamform__lastXTeam.srm-left .sr-last-matches__wdl span"
      );
      const results = {
        W: 0,
        D: 0,
        L: 0
      };

      homeMatches.forEach(match => {
        const result = match.innerText.trim();
        if (result === "W") {
          results.W++;
        } else if (result === "D") {
          results.D++;
        } else if (result === "L") {
          results.L++;
        }
      });

      return results;
    });

    // Extracting away team results
    const awayResults = await page.evaluate(() => {
      const awayMatches = document.querySelectorAll(
        ".sr-last-matches.sr-last-matches--right .sr-last-matches__wdl span"
      );
      const results = {
        W: 0,
        D: 0,
        L: 0
      };

      awayMatches.forEach(match => {
        const result = match.innerText.trim();
        if (result === "W") {
          results.W++;
        } else if (result === "D") {
          results.D++;
        } else if (result === "L") {
          results.L++;
        }
      });

      return results;
    });

    // console.log("Home League Position:", homeLeaguePosition);
    // console.log("Away League Position:", awayLeaguePosition);
    // console.log("Home Form: ", homeValue);
    // console.log("Away Form: ", awayValue);

    // console.log("Home Team Results:", homeResults);
    // console.log("Away Team Results:", awayResults);

    // Checking if they position is very close
    if (
      Math.abs(parseInt(homeLeaguePosition) - parseInt(awayLeaguePosition)) > 1
    ) {
      if (parseInt(homeLeaguePosition) < parseInt(awayLeaguePosition)) {
        if (
          parseInt(homeValue.replace("%", "")) >
          parseInt(awayValue.replace("%", ""))
        ) {
          if (homeResults.W >= 3 && homeResults.W < 5) {
            if (
              parseInt(homeValue.replace("%", "")) -
                parseInt(awayValue.replace("%", "")) >=
              40
            ) {
              await page.waitForSelector(".m-snap-nav");
              // Use page.evaluate to find the Table item and return a boolean
              await page.evaluate(() => {
                const items = document.querySelectorAll(".m-type-item");
                for (let item of items) {
                  if (item.textContent.trim() === "Table") {
                    item.click(); // Click on the "Table" item
                    return true; // Indicate the item was found and clicked
                  }
                }
                return false; // Indicate the item wasn't found
              });

              // Get if the team is more than 10 wins
              // Wait for the table to load (adjust the selector if necessary)
              await page.waitForSelector(".sr-livetable__table");

              // Evaluate the script in the context of the page
              const result = await page.evaluate(() => {
                // Get all rows that have the class 'srt-base-1-is-active'
                const rows = Array.from(
                  document.querySelectorAll("tr.srm-dataRow")
                );

                for (const row of rows) {
                  // Check if this row contains the 'srt-base-1-is-active' class in any <td>
                  const activeTd = row.querySelector("td.srt-base-1-is-active");
                  if (activeTd) {
                    // Find the <td> that contains the number of wins
                    const winsTd = row.querySelector('td[title="win"]');
                    if (winsTd) {
                      const wins = parseInt(winsTd.textContent.trim(), 10);
                      if (wins > 10) {
                        // Return the HTML of the matching row
                        return row.innerHTML;
                      }
                    }
                  }
                }
                return null;
              });

              if (result) {
                console.log("Found a row with wins > 10:");
                const pageUrl = await page.url();
                gameLinks.push(pageUrl);
              } 
            }
          }
        }
      } else if (parseInt(awayLeaguePosition) < parseInt(homeLeaguePosition)) {
        if (
          parseInt(awayValue.replace("%", "")) >
          parseInt(homeValue.replace("%", ""))
        ) {
          //Avoid consecutive 5 wins
          if (awayResults.W >= 3 && awayResults.W < 5) {
            if (
              parseInt(awayValue.replace("%", "")) -
                parseInt(homeValue.replace("%", "")) >=
              40
            ) {
              await page.waitForSelector(".m-snap-nav");
              // Find the "Table" item and click it
              await page.evaluate(() => {
                const items = document.querySelectorAll(".m-type-item");
                for (let item of items) {
                  if (item.textContent.trim() === "Table") {
                    item.click(); // Click on the "Table" item
                    return true; // Indicate the item was found and clicked
                  }
                }
                return false; // Indicate the item wasn't found
              });
              // Get if the team is more than 10 wins
              // Wait for the table to load (adjust the selector if necessary)
              await page.waitForSelector(".sr-livetable__table");

              // Evaluate the script in the context of the page
              const result = await page.evaluate(() => {
                // Get all rows that have the class 'srt-base-1-is-active'
                const rows = Array.from(
                  document.querySelectorAll("tr.srm-dataRow")
                );

                for (const row of rows) {
                  // Check if this row contains the 'srt-base-1-is-active' class in any <td>
                  const activeTd = row.querySelector("td.srt-base-1-is-active");
                  if (activeTd) {
                    // Find the <td> that contains the number of wins
                    const winsTd = row.querySelector('td[title="win"]');
                    if (winsTd) {
                      const wins = parseInt(winsTd.textContent.trim(), 10);
                      if (wins > 10) {
                        // Return the HTML of the matching row
                        return row.innerHTML;
                      }
                    }
                  }
                }
                return null;
              });

              if (result) {
                console.log("Found a row with wins > 10:");
                const pageUrl = await page.url();
                gameLinks.push(pageUrl);
              } 
            }
          }
        }
      }
    }
    return;
  } catch (error) {
    console.log("an error occurred: ", error);
    return;
  }
}

(async () => {
  try {
    const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();

    // Get today's day
    const today = new Date().getDay();

    // Define time based on today's day
    let time;
    switch (today) {
      case 0:
        time = 0;
        break; // Sunday
      case 1:
        time = 1;
        break; // Monday
      case 2:
        time = 2;
        break; // Tuesday
      case 3:
        time = 3;
        break; // Wednesday
      case 4:
        time = 4;
        break; // Thursday
      case 5:
        time = 5;
        break; // Friday
      case 6:
        time = 6;
        break; // Saturday
      default:
        time = 0;
        break; // Default to Sunday
    }

    // Construct URL
    // const tomorrowUrl = `https://www.sportybet.com/ng/m/sport/football?time=${time}&sort=0`;
    // const tomorrowUrl = `https://www.sportybet.com/ng/m/sport/football/`;
    // const tomorrowUrl = `https://www.sportybet.com/ng/m/sport/football/today?sort=0`;
    // const tomorrowUrl = `https://www.sportybet.com/ng/m/sport/football?time=${time +
    //   1}&sort=0`;
    // const tomorrowUrl = `https://www.sportybet.com/ng/m/sport/football?sort=1&time=${time + 1}`;
    const tomorrowUrl = `https://www.sportybet.com/ng/m/sport/football/today?source=sport_menu&sort=0`;

    // Open tomorrow's URL
    await page.goto(tomorrowUrl);

    // Define the scroll function
    const scrollUntilElementVisible = async () => {
      await page.evaluate(() => {
        window.scrollBy(0, 100); // Scroll down by 100 pixels
      });
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for 1 second for the page to settle
    };

    //Links to open new page
    let links = [];
    //Link to save page that obeys the rule
    let obeyLink = [];
    // Keep scrolling until the element is visible
    //Count
    let count = 0;
    while (true) {
      count++;

      // if (count % 4 === 0) {
      //   console.log("Cool down starting");
      //   await delay(500);
      //   console.log("Cool down ended");
      // }
      // Extract the links
      await scrollUntilElementVisible();
      links = await extractMatchInfo(page);
      if (links != undefined) {
        for (let i = 0; i < links.length; i++) {
          if (!obeyLink.includes(links[i].link)) {
            // Analysis is done here
            const newPage = await browser.newPage();
            newPage.goto(
              "https://www.sportybet.com/ng/m/sport/football/Japan/J3_League/Fukushima_United_FC_vs_Giravanz_Kitakyushu/sr:match:47298063"
            );
            // newPage.goto(links[i].link);
            await newPage.waitForNavigation();
            // Click on stat
            try {
              await newPage.waitForSelector(".m-icon.m-icon-stat", {
                timeout: 10000
              });
              await newPage.click(".m-icon.m-icon-stat");
              try {
                console.log("\n" + links[i].teams);
                await statistics(newPage);
              } catch (error) {
                console.log(error);
              }
            } catch (error) {
              console.log(error);
            }
            if (newPage != undefined) {
              await newPage.close();
            }
            obeyLink.push(links[i].link);
          }
        }
        console.log("Obey Link: ", obeyLink);

        console.log("Game Link Url: ", gameLinks);
      }

      await scrollUntilElementVisible();
      const stopLoadMore = await page.$(".bet-load-more-none");
      if (stopLoadMore) {
        // The element is visible, stop scrolling
        break;
      }
      fs.writeFile("gameLinks.txt", gameLinks.join("\n"), err => {
        if (err) {
          console.error("Error writing to file:", err);
        } else {
          console.log("Game links saved to gameLinks.txt");
        }
      });
    }
    console.log("Obey Link: ", obeyLink);

    console.log("Game Link Url: ", gameLinks);
    // Write the gameLinks to a text file

    await browser.close();
  } catch (error) {
    console.log("An error occurred:", error);
  }
})();
