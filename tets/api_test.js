import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config({ path: '.env' });

async function fetchFips() {
    const options = { method: 'GET', url: 'https://fiu-sandbox.setu.co/v2/fips' };

    try {
        const { data } = await axios.request(options);
        console.log(JSON.stringify(data));
    } catch (error) {
        console.error(error);
    }
}

async function getSetuAccessToken() {
    try {
        const { data } = await axios.post(
            'https://orgservice-prod.setu.co/v1/users/login',
            {
                clientID: process.env.SETU_CLIENT_ID,
                grant_type: 'client_credentials',
                secret: process.env.SETU_CLIENT_SECRET
            },
            {
                headers: {
                    client: 'bridge',
                    'Content-Type': 'application/json'
                }
            }
        );

        console.log(data);

        return data.access_token;
    } catch (error) {
        console.error(
            'Setu authentication failed:',
            error.response?.data || error.message
        );

        throw error;
    }
}

getSetuAccessToken();

async function createConsent() {
  try {
    const accessToken = process.env.SETU_ACCESS_TOKEN;
    const productInstanceId = process.env.SETU_PRODUCT_INSTANCE_ID;

    const response = await axios.post(
      "https://fiu-sandbox.setu.co/v2/consents",
      {
        PAN: "YOUR_TEST_PAN",

        consentDuration: {
          unit: "MONTH",
          value: 1
        },

        fetchType: "ONETIME",

        purpose: {
          code: "101",
          text: "Personal financial management",
          category: null,
          refUri: ""
        },

        consentTypes: [
          "PROFILE",
          "SUMMARY",
          "TRANSACTIONS"
        ],

        dataRange: {
          from: "2026-02-18T00:00:00Z",
          to: "2026-08-18T23:59:59Z"
        },

        fiTypes: [
          "DEPOSIT"
        ],

        consentMode: "VIEW",

        dataLife: {
          unit: "MONTH",
          value: 1
        },

        vua: "YOUR_TEST_VUA",

        consentDateRange: {
          startDate: "2026-08-18T00:00:00Z",
          endDate: "2026-09-18T00:00:00Z"
        },

        additionalParams: {
          tags: ["personal-finance-app"]
        },

        enableAdditionalPhoneNumber: false
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "x-product-instance-id": productInstanceId,
          "Content-Type": "application/json"
        }
      }
    );

    console.log(response.data);
  } catch (error) {
    console.error(
      "Consent creation failed:",
      error.response?.data || error.message
    );
  }
}

createConsent();

