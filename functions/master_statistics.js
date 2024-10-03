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
            //Focus on away to ensure it has conceeded more than 1 goal
            let count_loss_with_one_or_more_goal = 0;
            let conceded_goals_home = 0;
            //Focus on home because has higher form or equal form. Count Wins where goals is greater than 2
            let count_win_with_two_or_more_goal = 0;
            // Analyze and count home matches, total number of goals (TNOG)
            let count_homeMatchesTNOG = 0;
            let count_one_zero = 0;
            let conceded_goals_away = 0;
            // Analyze and count home matches, total number of goals (TNOG)
            let count_awayMatchesTNOG = 0;
            // Counting total goals scored and conceeded.
            let total_goals_scored = 0;
            let total_goals_conceeded = 0;
            let total_goals_scored_home = 0;
            let total_goals_conceeded_home = 0;
            let total_goals_scored_away = 0;
            let total_goals_conceeded_away = 0;
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
            homeMatchData.forEach(match => {
              const { result, homeGoals, awayGoals } = match;
              if (result === "L") {
                if (homeGoals > awayGoals) {
                  if (awayGoals > 0) {
                    count_homeMatchesTNOG++;
                  }
                  conceded_goals_home += parseInt(homeGoals);
                } else {
                  if (homeGoals > 0) {
                    count_homeMatchesTNOG++;
                  }
                  conceded_goals_home += parseInt(awayGoals);
                }
                total_goals_scored +=
                  homeGoals > awayGoals ? awayGoals : homeGoals;
                total_goals_conceeded +=
                  homeGoals > awayGoals ? homeGoals : awayGoals;
                total_goals_scored_home +=
                  homeGoals > awayGoals ? awayGoals : homeGoals;
                total_goals_conceeded_home +=
                  homeGoals > awayGoals ? homeGoals : awayGoals;
              } else if (result === "D") {
                if (homeGoals > 0 || awayGoals > 0) {
                  count_homeMatchesTNOG++;
                  conceded_goals_home += parseInt(awayGoals);
                }
                const goals = homeGoals;
                if (goals > 0) {
                  count_loss_with_one_or_more_goal++;
                }
                total_goals_scored += homeGoals;
                total_goals_conceeded += homeGoals;
                total_goals_scored_home += homeGoals;
                total_goals_conceeded_home += homeGoals;
              } else {
                count_homeMatchesTNOG++;
                const goals = homeGoals > awayGoals ? homeGoals : awayGoals;
                if (homeGoals > awayGoals) {
                  conceded_goals_home += parseInt(awayGoals);
                } else {
                  conceded_goals_home += parseInt(homeGoals);
                }
                if (goals >= 2) {
                  count_win_with_two_or_more_goal++;
                }
                if (parseInt(homeGoals) == 1 && parseInt(awayGoals) == 0) {
                  count_one_zero++;
                } else if (
                  parseInt(awayGoals) == 1 &&
                  parseInt(homeGoals) == 0
                ) {
                  count_one_zero++;
                }
                total_goals_scored +=
                  homeGoals > awayGoals ? homeGoals : awayGoals;
                total_goals_conceeded +=
                  homeGoals > awayGoals ? awayGoals : homeGoals;
                total_goals_scored_home +=
                  homeGoals > awayGoals ? homeGoals : awayGoals;
                total_goals_conceeded_home +=
                  homeGoals > awayGoals ? awayGoals : homeGoals;
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
            awayMatchData.forEach(match => {
              const { result, homeGoals, awayGoals } = match;
              if (result === "L") {
                if (homeGoals > awayGoals) {
                  if (awayGoals > 0) {
                    count_awayMatchesTNOG++;
                  }
                  conceded_goals_away += parseInt(homeGoals);
                } else {
                  if (homeGoals > 0) {
                    count_awayMatchesTNOG++;
                  }
                  conceded_goals_away += parseInt(awayGoals);
                }
                const goals = homeGoals < awayGoals ? homeGoals : awayGoals;
                if (goals > 0) {
                  count_loss_with_one_or_more_goal++;
                }
                total_goals_scored +=
                  awayGoals > homeGoals ? homeGoals : awayGoals;
                total_goals_conceeded +=
                  awayGoals > homeGoals ? awayGoals : homeGoals;
                total_goals_scored_away +=
                  awayGoals > homeGoals ? homeGoals : awayGoals;
                total_goals_conceeded_away +=
                  awayGoals > homeGoals ? awayGoals : homeGoals;
              } else if (result === "D") {
                if (homeGoals > 0 || awayGoals > 0) {
                  count_awayMatchesTNOG++;
                  conceded_goals_away += parseInt(homeGoals);
                }
                const goals = awayGoals;
                if (goals > 0) {
                  count_loss_with_one_or_more_goal++;
                }
                total_goals_scored += awayGoals;
                total_goals_conceeded += awayGoals;
                total_goals_scored_away += awayGoals;
                total_goals_conceeded_away += awayGoals;
              } else {
                count_awayMatchesTNOG++;
                const goals = homeGoals > awayGoals ? homeGoals : awayGoals;
                if (goals > 0) {
                  count_loss_with_one_or_more_goal++;
                }
                if (homeGoals > awayGoals) {
                  conceded_goals_away += parseInt(awayGoals);
                } else {
                  conceded_goals_away += parseInt(homeGoals);
                }
                if (parseInt(homeGoals) == 1 && parseInt(awayGoals) == 0) {
                  count_one_zero++;
                } else if (
                  parseInt(awayGoals) == 1 &&
                  parseInt(homeGoals) == 0
                ) {
                  count_one_zero++;
                }
                total_goals_scored +=
                  awayGoals > homeGoals ? awayGoals : homeGoals;
                total_goals_conceeded +=
                  awayGoals > homeGoals ? homeGoals : awayGoals;
                total_goals_scored_away +=
                  awayGoals > homeGoals ? awayGoals : homeGoals;
                total_goals_conceeded_away +=
                  awayGoals > homeGoals ? homeGoals : awayGoals;
              }
            });
            // console.log("Total Goal Scored: ", total_goals_scored);
            // console.log("Total Goal Conceeded: ", total_goals_conceeded);
            // console.log("Totals Goals Scored Home: ", total_goals_scored_home);
            // console.log(
            //   "Totals Goals Conceeded Home: ",
            //   total_goals_conceeded_home
            // );
            // console.log("Totals Goals Scored Away: ", total_goals_scored_away);
            // console.log(
            //   "Totals Goals Conceeded Away: ",
            //   total_goals_conceeded_away
            // );
            if (count_one_zero < 2) {
                if (
                    (total_goals_scored_home >= 6 && total_goals_conceeded_home >= 6) &&
                    (total_goals_scored_away >= 5 && total_goals_conceeded_away >= 7)
                  ) {
                //checking or obeying the 1.8 for the team A and 1.4 for team B (Home is the team A)
                const pageUrl = await page.url();
                return pageUrl;
              }
            }
            return null;
          }
          return null;
        } else {
          return null;
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
            //Declaring all the variables
            let conceded_goals_home = 0;
            //Focus on away to ensure it has conceeded more than 1 goal
            let count_loss_with_one_or_more_goal = 0;
            let conceded_goals_away = 0;
            let count_win_with_two_or_more_goal = 0;
            let count_one_zero = 0;
            // Analyze and count home matches, total number of goals (TNOG)
            let count_homeMatchesTNOG = 0;
            // Analyze and count home matches, total number of goals (TNOG)
            let count_awayMatchesTNOG = 0;
            let total_goals_scored = 0;
            let total_goals_conceeded = 0;
            let total_goals_scored_home = 0;
            let total_goals_conceeded_home = 0;
            let total_goals_scored_away = 0;
            let total_goals_conceeded_away = 0;
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
            homeMatchData.forEach(match => {
              const { result, homeGoals, awayGoals } = match;
              if (result === "L") {
                if (homeGoals > awayGoals) {
                  if (awayGoals > 0) {
                    count_homeMatchesTNOG++;
                  }
                  conceded_goals_home += parseInt(homeGoals);
                } else {
                  if (homeGoals > 0) {
                    count_homeMatchesTNOG++;
                  }
                  conceded_goals_away += parseInt(awayGoals);
                }
                total_goals_scored +=
                  homeGoals > awayGoals ? awayGoals : homeGoals;
                total_goals_conceeded +=
                  homeGoals > awayGoals ? homeGoals : awayGoals;
                total_goals_scored_home +=
                  homeGoals > awayGoals ? awayGoals : homeGoals;
                total_goals_conceeded_home +=
                  homeGoals > awayGoals ? homeGoals : awayGoals;
              } else if (result === "D") {
                if (homeGoals > 0 || awayGoals > 0) {
                  count_homeMatchesTNOG++;
                  conceded_goals_home += parseInt(awayGoals);
                }
                const goals = homeGoals;
                if (goals > 0) {
                  count_loss_with_one_or_more_goal++;
                }
                total_goals_scored += homeGoals;
                total_goals_conceeded += homeGoals;
                total_goals_scored_home += homeGoals;
                total_goals_conceeded_home += homeGoals;
              } else {
                count_homeMatchesTNOG++;
                const goals = homeGoals > awayGoals ? homeGoals : awayGoals;
                if (homeGoals > awayGoals) {
                  conceded_goals_home += parseInt(awayGoals);
                } else {
                  conceded_goals_home += parseInt(homeGoals);
                }
                if (goals >= 2) {
                  count_win_with_two_or_more_goal++;
                }
                if (parseInt(homeGoals) == 1 && parseInt(awayGoals) == 0) {
                  count_one_zero++;
                } else if (
                  parseInt(awayGoals) == 1 &&
                  parseInt(homeGoals) == 0
                ) {
                  count_one_zero++;
                }
                total_goals_scored +=
                  homeGoals > awayGoals ? homeGoals : awayGoals;
                total_goals_conceeded +=
                  homeGoals > awayGoals ? awayGoals : homeGoals;
                total_goals_scored_home +=
                  homeGoals > awayGoals ? homeGoals : awayGoals;
                total_goals_conceeded_home +=
                  homeGoals > awayGoals ? awayGoals : homeGoals;
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
            //Focus on Away because has higher form or equal form. Count Wins where goals is greater than 2
            awayMatchData.forEach(match => {
              const { result, homeGoals, awayGoals } = match;
              if (result === "L") {
                if (homeGoals > awayGoals) {
                  if (awayGoals > 0) {
                    count_awayMatchesTNOG++;
                  }
                  conceded_goals_away += parseInt(homeGoals);
                } else {
                  if (homeGoals > 0) {
                    count_awayMatchesTNOG++;
                  }
                  conceded_goals_away += parseInt(awayGoals);
                }
                const goals = homeGoals < awayGoals ? homeGoals : awayGoals;
                if (goals > 0) {
                  count_loss_with_one_or_more_goal++;
                }
                total_goals_scored +=
                  awayGoals > homeGoals ? homeGoals : awayGoals;
                total_goals_conceeded +=
                  awayGoals > homeGoals ? awayGoals : homeGoals;
                total_goals_scored_away +=
                  awayGoals > homeGoals ? homeGoals : awayGoals;
                total_goals_conceeded_away +=
                  awayGoals > homeGoals ? awayGoals : homeGoals;
              } else if (result === "D") {
                if (homeGoals > 0 || awayGoals > 0) {
                  count_awayMatchesTNOG++;
                  conceded_goals_away += parseInt(homeGoals);
                }
                const goals = awayGoals;
                if (goals > 0) {
                  count_loss_with_one_or_more_goal++;
                }
                total_goals_scored += awayGoals;
                total_goals_conceeded += awayGoals;
                total_goals_scored_away += awayGoals;
                total_goals_conceeded_away += awayGoals;
              } else {
                count_awayMatchesTNOG++;
                const goals = homeGoals > awayGoals ? homeGoals : awayGoals;
                if (goals > 0) {
                  count_loss_with_one_or_more_goal++;
                }
                if (homeGoals > awayGoals) {
                  conceded_goals_away += parseInt(awayGoals);
                } else {
                  conceded_goals_away += parseInt(homeGoals);
                }
                if (parseInt(homeGoals) == 1 && parseInt(awayGoals) == 0) {
                  count_one_zero++;
                } else if (
                  parseInt(awayGoals) == 1 &&
                  parseInt(homeGoals) == 0
                ) {
                  count_one_zero++;
                }
                total_goals_scored +=
                  awayGoals > homeGoals ? awayGoals : homeGoals;
                total_goals_conceeded +=
                  awayGoals > homeGoals ? homeGoals : awayGoals;
                total_goals_scored_away +=
                  awayGoals > homeGoals ? awayGoals : homeGoals;
                total_goals_conceeded_away +=
                  awayGoals > homeGoals ? homeGoals : awayGoals;
              }
            });
            // console.log("Total Goal Scored: ", total_goals_scored);
            // console.log("Total Goal Conceeded: ", total_goals_conceeded);
            // console.log("Totals Goals Scored Home: ", total_goals_scored_home);
            // console.log(
            //   "Totals Goals Conceeded Home: ",
            //   total_goals_conceeded_home
            // );
            // console.log("Totals Goals Scored Away: ", total_goals_scored_away);
            // console.log(
            //   "Totals Goals Conceeded Away: ",
            //   total_goals_conceeded_away
            // );
            if (count_one_zero < 2) {
              if (
                (total_goals_scored_away >= 6 && total_goals_conceeded_away >= 6) &&
                (total_goals_scored_home >= 5 && total_goals_conceeded_home >= 7)
              ) {
                //Checking or obeying the 1.8 for the team A and 1.4 for team B (Away is the Team A)
                const pageUrl = await page.url();
                return pageUrl;
              }
            }

            return null;
          }
          return null;
        } else {
          return null;
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
