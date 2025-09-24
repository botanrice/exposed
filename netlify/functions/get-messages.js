exports.handler = async (event, context) => {
  // Set CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS'
  };

  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers
    };
  }

  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const NETLIFY_API_TOKEN = process.env.NETLIFY_API_TOKEN;
    const SITE_ID = process.env.SITE_ID;
    
    if (!NETLIFY_API_TOKEN || !SITE_ID) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Missing environment variables' })
      };
    }

    // Fetch form submissions from Netlify API
    const response = await fetch(
      `https://api.netlify.com/api/v1/sites/${SITE_ID}/submissions?form_name=community-messages`,
      {
        headers: {
          'Authorization': `Bearer ${NETLIFY_API_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }

    const submissions = await response.json();
    
    // Transform submissions into message format
    const messages = submissions.map(submission => ({
      id: submission.id,
      author: submission.data.name || 'Anonymous',
      content: submission.data.message || '',
      timestamp: submission.created_at
    }))
    // Sort by newest first
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    return {
      statusCode: 200,
      headers: {
        ...headers,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(messages)
    };

  } catch (error) {
    console.error('Error fetching messages:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Failed to fetch messages',
        details: error.message 
      })
    };
  }
};