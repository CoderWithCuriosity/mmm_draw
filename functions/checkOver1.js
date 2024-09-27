async function checkOver1(page) {
  try {
    await page.waitForSelector(".m-icon.m-icon-market", {
      timeout: 10000
    });
  } catch (error) {
    console.log("Error getting market page!");
    return false;
  }
  await page.click(".m-icon.m-icon-market");
  // Wait for the navigation to load and ensure the "All" item is rendered
  await page.waitForSelector(".m-snap-nav .m-sport-group-item");

  // Use evaluate to interact with the page and click on the "All" element
  await page.evaluate(() => {
    const items = document.querySelectorAll(".m-snap-nav .m-sport-group-item");

    // Loop through the items and click the one that contains the text "All"
    items.forEach(item => {
      if (item.innerText.trim() === "All") {
        item.click();
      }
    });
  });

  const scrollUntilElementVisible = async () => {
    await page.evaluate(() => {
      window.scrollBy(0, 300);
    });
    await new Promise(resolve => setTimeout(resolve, 1000));
  };
  await scrollUntilElementVisible();

  try {
    // Wait for the market content to load
    await page.waitForSelector(".m-table.market-content", {
      timeout: 10000
    });
  } catch (error) {
    console.log("Error getting market page!");
    return false;
  }

  // Extract the odds for "Over 1.5" and perform the comparison
  const over1_5odds = await page.evaluate(() => {
    const rows = document.querySelectorAll(".m-table-row");

    for (let row of rows) {
      const specifier = row.querySelector(".m-specifier-colum-title em");

      // Check if this row is for "1.5"
      if (specifier && specifier.innerText.trim() === "1.5") {
        const overOdds = row
          .querySelector(".m-table-cell:nth-child(2) em")
          .innerText.trim();
        return parseFloat(overOdds); // Return the odds as a number
      }
    }

    return null; // Return null if "1.5" not found
  });


  // Check if the odds exist and if they are greater than or equal to 1.20
  if (over1_5odds !== null) {
    if (over1_5odds >= 1.2) {
      console.log(
        `Over 1.5 has odds of ${over1_5odds}, which is greater than or equal to 1.20.`
      );
      return true;
    } else {
      console.log(
        `Over 1.5 has odds of ${over1_5odds}, which is less than 1.20.`
      );
      return false;
    }
  } else {
    console.log("Over 1.5 option not found.");
    return false;
  }
}

module.exports = checkOver1;
