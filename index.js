const dotenv = require("dotenv");
const searchTerm ="epilepsy"
dotenv.config();

const fetch = require("node-fetch");
const algoliasearch = require("algoliasearch");

const client = algoliasearch(
  process.env.ALGOLIA_APP_ID,
  process.env.ALGOLIA_ADMIN_KEY
);
const index = client.initIndex(process.env.ALGOLIA_INDEX);
const limit = Number(process.env.DISCOVER_API_LIMIT) || 0;
const discoverApi = process.env.DISCOVER_API;

/**
 * Get datasets from Discover, including pagination if needed
 * @param {Number} offset
 * @returns {Array}
 */
const getDatasets = async (offset = 0) => {
  console.log(`## Fetching datasets ${offset} - ${limit + offset}`);

  try {
    const response = await fetch(
      `${discoverApi}/search/datasets?limit=${limit}&offset=${offset}&query=${searchTerm}`
    );
    const { datasets, totalCount } = await response.json();

    console.log(`## Datasets retrieved: ${datasets.length}`);

    if (totalCount > limit + offset) {
      return datasets.concat(await getDatasets(offset + limit));
    } else {
      return datasets;
    }
  } catch (error) {
    console.log(error);
    return [];
  }
};

/**
 * Populate Algolia by first getting all datasets,
 * transforming them to including `objectID` as the dataset's ID
 * and using the Algolia client to replace all objects
 */
const populateAlgolia = async () => {
  const datasets = await getDatasets();
  if (datasets.length) {
    const results = datasets.map((dataset) => {
      return {
        objectID: dataset.id,
        ...dataset,
      };
    });

    index
      .replaceAllObjects(results)
      .then(({ objectIDs }) => {
        console.log(`## Algolia populated with ${datasets.length} datasets`);
        console.log(objectIDs);
      })
      .catch((error) => {
        console.log(error);
      });
  } else {
    console.log("## No datasets found, Agolia not populated");
  }
};

populateAlgolia();
