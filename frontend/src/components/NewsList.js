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
            .finally(() => alive && setPending(
