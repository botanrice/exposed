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
    // Fetch the Are.na channel data for "sto!"
    const response = await fetch('https://api.are.na/v2/channels/sto-glmccsmk5nq');
    
    if (!response.ok) {
      throw new Error(`Are.na API request failed: ${response.status}`);
    }

    const channelData = await response.json();

    // Check if there are any channel contents, if not handle gracefully
    if (!channelData.contents || channelData.contents.length === 0) {
      return {
        statusCode: 200,
        headers: {
          ...headers,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: channelData.title,
          slug: channelData.slug,
          length: 0,
          updated_at: channelData.updated_at,
          contents: []
        })
      };
    }
    
    // Sort the channel by block position, then fetch only the first 4 blocks
    const sortedBlocks = channelData.contents.sort((a, b) => b.position - a.position);
    // Transform the data to include only what we need for the gallery
    // Limit to bottom 4 blocks only
    const bottomBlocks = sortedBlocks.slice(-4);

    const galleryData = {
      title: channelData.title,
      slug: channelData.slug,
      length: bottomBlocks.length,
      updated_at: channelData.updated_at,
      contents: bottomBlocks.map(block => {
        const baseBlock = {
          id: block.id,
          title: block.title,
          class: block.class,
          updated_at: block.updated_at,
          connected_at: block.connected_at
        };

        // Handle different block types
        switch (block.class) {
          case 'Image':
            return {
              ...baseBlock,
              image: {
                original: block.image?.original?.url,
                large: block.image?.large?.url,
                square: block.image?.square?.url,
                thumb: block.image?.thumb?.url
              }
            };
          case 'Text':
            return {
              ...baseBlock,
              content: block.content,
              content_html: block.content_html
            };
          case 'Link':
            return {
              ...baseBlock,
              source: block.source,
              description: block.description,
              image: block.image ? {
                original: block.image?.original?.url,
                large: block.image?.large?.url,
                thumb: block.image?.thumb?.url
              } : null
            };
          case 'Attachment':
            return {
              ...baseBlock,
              attachment: {
                url: block.attachment?.url,
                content_type: block.attachment?.content_type,
                file_name: block.attachment?.file_name
              }
            };
          default:
            return baseBlock;
        }
      })
    };

    return {
      statusCode: 200,
      headers: {
        ...headers,
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=300' // Cache for 5 minutes
      },
      body: JSON.stringify(galleryData)
    };

  } catch (error) {
    console.error('Error fetching Are.na channel:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Failed to fetch Are.na channel',
        details: error.message 
      })
    };
  }
};