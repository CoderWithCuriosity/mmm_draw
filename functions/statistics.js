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

    if (
      parseInt(homeValue.replace("%", "")) < 40 &&
      parseInt(awayValue.replace("%", "")) < 40
    ) {
      return;
    }

    // Checking if they position is very close
    if (parseInt(homeLeaguePosition) <= parseInt(awayLeaguePosition)) {
      if (
        parseInt(homeValue.replace("%", "")) >=
        parseInt(awayValue.replace("%", ""))
      ) {
        if (homeResults.W >= 2) {
          if (
            parseInt(homeValue.replace("%", "")) -
              parseInt(awayValue.replace("%", "")) >=
            10
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

            await page.evaluate(() => {
              const items = document.querySelectorAll(".m-type-item");
              for (let item of items) {
                if (item.textContent.trim() === "H2H") {
                  item.click(); // Click on the "H2H" item
                  return true; // Indicate the item was found and clicked
                }
              }
              return false; // Indicate the item wasn't found
            });

            // Wait for the DOM to load
            await page.waitForSelector(".sr-leaguepositionform__wrapper", {
              timeout: 10000
            });

            // Extract home match data
            const homeMatchData = await page.evaluate(() => {
              const matches = [];
              document
                .querySelectorAll(
                  ".sr-last-matches.sr-last-matches--left .sr-last-matches__match"
                )
                .forEach(match => {
                  const result = match
                    .querySelector(".sr-last-matches__wdl span")
                    .textContent.trim();
                  const score = match
                    .querySelector(".sr-last-matches__score")
                    .textContent.trim();
                  const scoreExtraStatus = match.querySelector(
                    ".sr-last-matches__score-extra-status"
                  )
                    ? match
                        .querySelector(".sr-last-matches__score-extra-status")
                        .textContent.trim()
                    : "";

                  let [homeGoals, awayGoals] = score.split(":").map(Number);
                  if (scoreExtraStatus.includes("AP")) {
                    homeGoals = "0";
                    awayGoals = "0";
                  }

                  matches.push({ result, homeGoals, awayGoals });
                });
              return matches;
            });

            // Analyze and count home matches, total number of goals (TNOG)
            let count_homeMatchesTNOG = 0;
            homeMatchData.forEach(match => {
              const { result, homeGoals, awayGoals } = match;
              if (result === "L") {
                if (homeGoals > awayGoals) {
                  if (awayGoals > 0) {
                    count_homeMatchesTNOG++;
                  }
                } else {
                  if (homeGoals > 0) {
                    count_homeMatchesTNOG++;
                  }
                }
              } else if (result === "D") {
                if (homeGoals > 0 || awayGoals > 0) {
                  count_homeMatchesTNOG++;
                }
              } else {
                count_homeMatchesTNOG++;
              }
            });

            // Extract away match data
            const awayMatchData = await page.evaluate(() => {
              const matches = [];
              document
                .querySelectorAll(
                  ".sr-last-matches.sr-last-matches--right .sr-last-matches__match"
                )
                .forEach(match => {
                  const result = match
                    .querySelector(".sr-last-matches__wdl span")
                    .textContent.trim();
                  const score = match
                    .querySelector(".sr-last-matches__score")
                    .textContent.trim();
                  const scoreExtraStatus = match.querySelector(
                    ".sr-last-matches__score-extra-status"
                  )
                    ? match
                        .querySelector(".sr-last-matches__score-extra-status")
                        .textContent.trim()
                    : "";

                  let [homeGoals, awayGoals] = score.split(":").map(Number);
                  if (scoreExtraStatus.includes("AP")) {
                    homeGoals = "0";
                    awayGoals = "0";
                  }

                  matches.push({ result, homeGoals, awayGoals });
                });
              return matches;
            });

            // Analyze and count home matches, total number of goals (TNOG)
            let count_awayMatchesTNOG = 0;
            awayMatchData.forEach(match => {
              const { result, homeGoals, awayGoals } = match;
              if (result === "L") {
                if (homeGoals > awayGoals) {
                  if (awayGoals > 0) {
                    count_awayMatchesTNOG++;
                  }
                } else {
                  if (homeGoals > 0) {
                    count_awayMatchesTNOG++;
                  }
                }
              } else if (result === "D") {
                if (homeGoals > 0 || awayGoals > 0) {
                  count_awayMatchesTNOG++;
                }
              } else {
                count_awayMatchesTNOG++;
              }
            });

            //Total matches with goals
            let TNOG = count_homeMatchesTNOG + count_awayMatchesTNOG;

            // console.log(
            //   `Passed!!!\nHome League Position: ${homeLeaguePosition}\nAway League Position: ${awayLeaguePosition}\nHome Form: ${homeValue}\nAway Form: ${awayValue}\nHome Results: ${homeMatchData}\nAway Results: ${awayMatchData}\nHome Matches TNOG: ${count_homeMatchesTNOG}\nAway Matches TNOG: ${count_awayMatchesTNOG}\nTotal Home Matches TNOG: ${TNOG}`
            // );
            console.log("Total Home Matches TNOG: ", count_homeMatchesTNOG);
            console.log("Total Away Matches TNOG: ", count_awayMatchesTNOG);
            if (count_homeMatchesTNOG >= 3 && count_awayMatchesTNOG >= 3) {
              if (TNOG >= 7) {
                const pageUrl = await page.url();
                return pageUrl;
              } else {
                return null;
              }
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
        if (awayResults.W >= 2) {
          if (
            parseInt(awayValue.replace("%", "")) -
              parseInt(homeValue.replace("%", "")) >=
            10
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

            await page.evaluate(() => {
              const items = document.querySelectorAll(".m-type-item");
              for (let item of items) {
                if (item.textContent.trim() === "H2H") {
                  item.click(); // Click on the "H2H" item
                  return true; // Indicate the item was found and clicked
                }
              }
              return false; // Indicate the item wasn't found
            });

            // Wait for the DOM to load
            await page.waitForSelector(".sr-leaguepositionform__wrapper", {
              timeout: 10000
            });

            // Extract home match data
            const homeMatchData = await page.evaluate(() => {
              const matches = [];
              document
                .querySelectorAll(
                  ".sr-last-matches.sr-last-matches--left .sr-last-matches__match"
                )
                .forEach(match => {
                  const result = match
                    .querySelector(".sr-last-matches__wdl span")
                    .textContent.trim();
                  const score = match
                    .querySelector(".sr-last-matches__score")
                    .textContent.trim();
                  const scoreExtraStatus = match.querySelector(
                    ".sr-last-matches__score-extra-status"
                  )
                    ? match
                        .querySelector(".sr-last-matches__score-extra-status")
                        .textContent.trim()
                    : "";

                  let [homeGoals, awayGoals] = score.split(":").map(Number);
                  if (scoreExtraStatus.includes("AP")) {
                    homeGoals = "0";
                    awayGoals = "0";
                  }

                  matches.push({ result, homeGoals, awayGoals });
                });
              return matches;
            });

            // Analyze and count home matches, total number of goals (TNOG)
            let count_homeMatchesTNOG = 0;
            homeMatchData.forEach(match => {
              const { result, homeGoals, awayGoals } = match;
              if (result === "L") {
                if (homeGoals > awayGoals) {
                  if (awayGoals > 0) {
                    count_homeMatchesTNOG++;
                  }
                } else {
                  if (homeGoals > 0) {
                    count_homeMatchesTNOG++;
                  }
                }
              } else if (result === "D") {
                if (homeGoals > 0 || awayGoals > 0) {
                  count_homeMatchesTNOG++;
                }
              } else {
                count_homeMatchesTNOG++;
              }
            });

            // Extract away match data
            const awayMatchData = await page.evaluate(() => {
              const matches = [];
              document
                .querySelectorAll(
                  ".sr-last-matches.sr-last-matches--right .sr-last-matches__match"
                )
                .forEach(match => {
                  const result = match
                    .querySelector(".sr-last-matches__wdl span")
                    .textContent.trim();
                  const score = match
                    .querySelector(".sr-last-matches__score")
                    .textContent.trim();
                  const scoreExtraStatus = match.querySelector(
                    ".sr-last-matches__score-extra-status"
                  )
                    ? match
                        .querySelector(".sr-last-matches__score-extra-status")
                        .textContent.trim()
                    : "";

                  let [homeGoals, awayGoals] = score.split(":").map(Number);
                  if (scoreExtraStatus.includes("AP")) {
                    homeGoals = "0";
                    awayGoals = "0";
                  }

                  matches.push({ result, homeGoals, awayGoals });
                });
              return matches;
            });

            // Analyze and count home matches, total number of goals (TNOG)
            let count_awayMatchesTNOG = 0;
            awayMatchData.forEach(match => {
              const { result, homeGoals, awayGoals } = match;
              if (result === "L") {
                if (homeGoals > awayGoals) {
                  if (awayGoals > 0) {
                    count_awayMatchesTNOG++;
                  }
                } else {
                  if (homeGoals > 0) {
                    count_awayMatchesTNOG++;
                  }
                }
              } else if (result === "D") {
                if (homeGoals > 0 || awayGoals > 0) {
                  count_awayMatchesTNOG++;
                }
              } else {
                count_awayMatchesTNOG++;
              }
            });

            //Total matches with goals
            let TNOG = count_homeMatchesTNOG + count_awayMatchesTNOG;

            // console.log(
            //   `Passed!!!\nHome League Position: ${homeLeaguePosition}\nAway League Position: ${awayLeaguePosition}\nHome Form: ${homeValue}\nAway Form: ${awayValue}\nHome Results: ${homeMatchData}\nAway Results: ${awayMatchData}\nHome Matches TNOG: ${count_homeMatchesTNOG}\nAway Matches TNOG: ${count_awayMatchesTNOG}\nTotal Home Matches TNOG: ${TNOG}`
            // );
            console.log("Total Home Matches TNOG: ", count_homeMatchesTNOG);
            console.log("Total Away Matches TNOG: ", count_awayMatchesTNOG);
            if (count_homeMatchesTNOG >= 3 && count_awayMatchesTNOG >= 3) {
              if (TNOG >= 7) {
                const pageUrl = await page.url();
                return pageUrl;
              } else {
                return null;
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

module.exports = statistics;
