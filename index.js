// Express app that handles both REST and SOAP versions of the same banking operation
const express = require('express');
const bodyParser = require('body-parser');
const { parseStringPromise, Builder } = require('xml2js');

const app = express();
const PORT = 3000;

// REST API Middleware
app.use(express.json());

// SOAP XML Middleware
app.use(bodyParser.text({ type: 'text/xml' }));

// Mock database
const accounts = {
  '1234567890': {
    accountNumber: '1234567890',
    balance: 2500.75,
    currency: 'USD'
  },
};

// ---------------------------
// ✅ REST Endpoint
// ---------------------------
app.get('/api/accounts/:accountNumber/balance', (req, res) => {
  const account = accounts[req.params.accountNumber];
  if (!account) {
    return res.status(404).json({ error: 'Account not found' });
  }
  res.json(account);
});

// ---------------------------
// ✅ SOAP Endpoint
// ---------------------------
app.post('/soap', async (req, res) => {
  try {
    const xml = req.body;
    const result = await parseStringPromise(xml);

    const accountNumber =
      result?.['soapenv:Envelope']?.['soapenv:Body']?.[0]?.['bank:GetAccountBalance']?.[0]?.['bank:accountNumber']?.[0];

    const account = accounts[accountNumber];

    const builder = new Builder();
    let responseObj;

    if (!account) {
      // Optional: SOAP Fault message
      responseObj = {
        'soapenv:Envelope': {
          $: {
            'xmlns:soapenv': 'http://schemas.xmlsoap.org/soap/envelope/'
          },
          'soapenv:Body': [
            {
              'soapenv:Fault': [
                {
                  faultcode: 'soapenv:Client',
                  faultstring: 'Account not found'
                }
              ]
            }
          ]
        }
      };
    } else {
      responseObj = {
        'soapenv:Envelope': {
          $: {
            'xmlns:soapenv': 'http://schemas.xmlsoap.org/soap/envelope/',
            'xmlns:bank': 'http://api.bank.com/schema'
          },
          'soapenv:Body': [
            {
              'bank:GetAccountBalanceResponse': [
                {
                  'bank:accountNumber': [account.accountNumber],
                  'bank:balance': [account.balance.toString()],
                  'bank:currency': [account.currency]
                }
              ]
            }
          ]
        }
      };
    }

    const responseXml = builder.buildObject(responseObj);
    res.set('Content-Type', 'text/xml');
    res.send(responseXml);
  } catch (err) {
    console.error(err);
    res.status(500).send('Invalid SOAP Request');
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
