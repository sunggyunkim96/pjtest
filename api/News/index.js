const axios = require('axios');

// 환경 변수에서 NewsAPI 키를 불러옵니다.
const NEWSAPI_KEY = process.env.NEWSAPI_KEY;

module.exports = async function (context, req) {
    context.log('NewsAPI 호출을 시작합니다.');

    // 검색어를 '추천'으로 고정하고, 한국어 기사만 필터링
    const query = '추천';
    const url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(query)}&apiKey=${NEWSAPI_KEY}&language=ko&sortBy=publishedAt&pageSize=20`;

    try {
        const response = await axios.get(url);
        
        if (response.data.articles.length === 0) {
            context.res = {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ items: [] })
            };
            return;
        }

        const articles = response.data.articles.map(article => ({
            title: article.title,
            link: article.url,
            press: article.source.name,
            time: article.publishedAt
        }));

        context.res = {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ items: articles })
        };

    } catch (error) {
        context.log.error('NewsAPI 호출 실패:', error.response ? error.response.data : error.message);
        context.res = {
            status: 500,
            body: JSON.stringify({ 
                error: '뉴스 검색 API 호출 실패',
                details: error.response ? error.response.data : error.message
            })
        };
    }
};
