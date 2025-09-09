import React, { useEffect, useMemo, useState } from "react";

// --- [수정] ---
// .env 파일의 REACT_APP_API_BASE_URL 값을 사용합니다.
// 만약 .env 파일에 값이 없으면 (로컬 개발 시) "http://localhost:7071"을 기본값으로 사용합니다.
const API_BASE = process.env.REACT_APP_API_BASE_URL || "http://localhost:7071";

export default function NewsList({ date }) {
    const [items, setItems] = useState([]);
    const [pending, setPending] = useState(true);
    const [error, setError] = useState("");
    const [visibleCount, setVisibleCount] = useState(4); // 처음 4개만 표시

    useEffect(() => {
        let alive = true;
        setPending(true);
        setError("");
        setVisibleCount(4); // 날짜가 변경될 때마다 표시 개수 초기화

        const url = date
            ? `${API_BASE}/api/news?date=${encodeURIComponent(date)}`
            : `${API_BASE}/api/news`;

        fetch(url)
            .then(async (res) => {
                const ct = res.headers.get("content-type") || "";
                const data = ct.includes("application/json")
                    ? await res.json().catch(() => ({}))
                    : {};

                if (!res.ok) {
                    const msg = data.error ? `${data.error}` : `HTTP ${res.status}`;
                    const err = new Error(msg);
                    err.status = res.status;
                    throw err;
                }

                const list = Array.isArray(data.items) ? data.items : [];
                if (alive) setItems(list);
            })
            .catch((err) => {
                if (!alive) return;
                setError(err.message || "뉴스 로딩 실패");
            })
            .finally(() => alive && setPending(false));

        return () => {
            alive = false;
        };
    }, [date]);

    // 현재 표시할 뉴스 아이템들
    const visibleItems = useMemo(() => {
        return items.slice(0, visibleCount);
    }, [items, visibleCount]);

    // 더 보기 버튼 핸들러
    const handleShowMore = () => {
        setVisibleCount(prev => Math.min(prev + 4, items.length));
    };

    // 로딩 중 상태
    if (pending) {
        return (
            <div className="news-list-container">
                <div className="loading-message">
                    뉴스를 불러오는 중...
                </div>
            </div>
        );
    }

    // 에러 상태
    if (error) {
        return (
            <div className="news-list-container">
                <div className="error-message">
                    {error}
                </div>
            </div>
        );
    }

    // 뉴스가 없는 경우
    if (items.length === 0) {
        return (
            <div className="news-list-container">
                <div className="no-news-message">
                    {date ? `${date}에 대한 뉴스가 없습니다.` : "뉴스가 없습니다."}
                </div>
            </div>
        );
    }

    return (
        <div className="news-list-container">
            <div className="news-list">
                {visibleItems.map((item, index) => (
                    <div key={index} className="news-item">
                        <h3 className="news-title">
                            {item.url ? (
                                <a 
                                    href={item.url} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="news-link"
                                >
                                    {item.title}
                                </a>
                            ) : (
                                item.title
                            )}
                        </h3>
                        {item.description && (
                            <p className="news-description">
                                {item.description}
                            </p>
                        )}
                        {item.pubDate && (
                            <div className="news-date">
                                {new Date(item.pubDate).toLocaleDateString('ko-KR')}
                            </div>
                        )}
                        {item.source && (
                            <div className="news-source">
                                출처: {item.source}
                            </div>
                        )}
                    </div>
                ))}
            </div>
            
            {/* 더 보기 버튼 */}
            {visibleCount < items.length && (
                <div className="load-more-container">
                    <button 
                        className="load-more-btn" 
                        onClick={handleShowMore}
                    >
                        더 보기 ({items.length - visibleCount}개 남음)
                    </button>
                </div>
            )}
            
            {/* 전체 뉴스 개수 표시 */}
            <div className="news-count">
                전체 {items.length}개 뉴스 중 {visibleItems.length}개 표시
            </div>
        </div>
    );
}
