exports.handler = async (event, context) => {
  const url = 'https://www.thebbnpost.in/feeds/posts/default?alt=json&max-results=20';
  try {
    const response = await fetch(url);
    const data = await response.json();
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to fetch feed' })
    };
  }
};