async function checkWins(page, teamType) {
  // Selectors for the win counts
  const homeWinsSelector =
    ".sr-lastmeetingsresults__team-holder-home .sr-lastmeetingsresults__win-count";
  const awayWinsSelector =
    ".sr-lastmeetingsresults__team-holder-away .sr-lastmeetingsresults__win-count";

  // Get the win counts
  const homeWins = await page.$eval(homeWinsSelector, el =>
    parseInt(el.textContent.trim(), 10)
  );
  const awayWins = await page.$eval(awayWinsSelector, el =>
    parseInt(el.textContent.trim(), 10)
  );

  let result;

  if (teamType === "home") {
    result = homeWins > awayWins;
  } else if (teamType === "away") {
    result = awayWins > homeWins;
  }
  return result;
}
