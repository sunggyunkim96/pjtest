import React, { useState, useEffect, useRef } from 'react';

// --- 아이콘 SVG 컴포넌트 ---
const SoundIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg> );
const StopIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="6" y="6" width="12" height="12"></rect></svg> );
const BookmarkIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"></path></svg> );

const MindPostbox = () => {
    const [selectedMood, setSelectedMood] = useState(null);
    const [text, setText] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState(null);
    const [showResult, setShowResult] = useState(false);
    const [feedback, setFeedback] = useState({ message: null, type: 'error' });
    const [isSaved, setIsSaved] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [isFetchingAudio, setIsFetchingAudio] = useState(false);
    const audioRef = useRef(null);

    useEffect(() => {
        return () => {
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current = null;
            }
        };
    }, [message]);
    
    const showFeedback = (message, type = 'error', duration = 3000) => {
        setFeedback({ message, type });
        setTimeout(() => setFeedback({ message: null, type: 'error' }), duration);
    };

    const handleMoodSelect = (mood) => {
        setSelectedMood(mood);
        if (feedback.message) setFeedback({ message: null, type: 'error' });
    };

    const handleTextChange = (e) => {
        setText(e.target.value);
    };

    const sendMessage = async () => {
        if (!selectedMood) {
            showFeedback("지금 기분을 선택해주세요.");
            return;
        }
        if (text.trim() === "") {
            showFeedback("당신의 이야기를 들려주세요.");
            return;
        }

        setIsLoading(true);
        setFeedback({ message: null, type: 'error' });
        setIsSaved(false); 

        if (audioRef.current) {
            audioRef.current.pause();
            setIsSpeaking(false);
        }

        try {
            // --- [수정 1] API 호출 경로 변경 ---
            // .env 파일의 REACT_APP_API_BASE_URL 값을 사용합니다.
            const functionUrl = `${process.env.REACT_APP_API_BASE_URL}/GetRandomMessage?mood=${selectedMood}`;
            const response = await fetch(functionUrl);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "서버에서 응답을 받지 못했습니다.");
            }

            setMessage(data.content);
            setShowResult(true);
        } catch (err) {
            showFeedback(err.message || "메시지를 가져오는 중 오류가 발생했습니다.");
            console.error("Error fetching message:", err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSpeak = async () => {
        if (isSpeaking) {
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current.currentTime = 0;
            }
            setIsSpeaking(false);
            return;
        }

        if (!message) return;
        
        setIsFetchingAudio(true);
        setFeedback({ message: null, type: 'error' });

        try {
            // --- [수정 2] TextToSpeech API 호출 경로 변경 ---
            // .env 파일의 REACT_APP_API_BASE_URL 값을 사용합니다.
            const response = await fetch(`${process.env.REACT_APP_API_BASE_URL}/TextToSpeech`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: message, mood: selectedMood })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || "음성 변환에 실패했습니다.");
            }
            
            // (사용자님의 기존 오디오 처리 로직이 여기에 들어갑니다)
            // 예시: 오디오 Blob을 받아와서 재생
            const audioBlob = await response.blob();
            const audioUrl = URL.createObjectURL(audioBlob);
            
            if (audioRef.current) {
                audioRef.current.pause();
            }
            audioRef.current = new Audio(audioUrl);
            audioRef.current.play();
            setIsSpeaking(true);

            audioRef.current.onended = () => {
                setIsSpeaking(false);
            };

        } catch (err) {
            showFeedback(err.message);
            console.error("Error fetching audio:", err);
        } finally {
            setIsFetchingAudio(false);
        }
    };
    
    const handleSaveMessage = () => {
        if (!message) return; 

        try {
            const existingMessages = sessionStorage.getItem('savedMessages');
            let messages = existingMessages ? JSON.parse(existingMessages) : [];

            const newMessage = {
                id: Date.now(),
                content: message,
                mood: selectedMood,
                date: new Date().toISOString()
            };

            messages.push(newMessage);
            sessionStorage.setItem('savedMessages', JSON.stringify(messages));
            
            setIsSaved(true);
            showFeedback("메시지가 보관함에 저장되었습니다!", "success");
        } catch (err) {
            console.error("Failed to save message:", err);
            showFeedback("메시지 저장에 실패했습니다.");
        }
    };

    const resetForm = () => {
        setSelectedMood(null);
        setText("");
        setIsLoading(false);
        setFeedback({ message: null, type: 'error' });
        setMessage(null);
        setShowResult(false);
        setIsSaved(false);
        if (audioRef.current) {
            audioRef.current.pause();
            setIsSpeaking(false);
        }
    };

    return (
        <div className="mind-postbox-container">
            <h2 className="postbox-title">마음 우체통</h2>
            <p className="postbox-subtitle">
                당신의 마음을 전해주세요. 좋은 기분이든, 나쁜 기분이든 모두 괜찮아요.
            </p>

            <div className="mood-section">
                <button className={`mood-btn good ${selectedMood === "good" ? "selected" : ""}`} onClick={() => handleMoodSelect("good")}>😊 좋음</button>
                <button className={`mood-btn bad ${selectedMood === "bad" ? "selected" : ""}`} onClick={() => handleMoodSelect("bad")}>😔 나쁨</button>
            </div>

            <div className="text-section">
                <textarea
                    className="text-input"
                    placeholder="당신의 이야기를 들려주세요..."
                    maxLength="500"
                    value={text}
                    onChange={handleTextChange}
                ></textarea>
            </div>

            <button className="submit-btn" onClick={sendMessage} disabled={isLoading}>
                {isLoading ? (
                    <><span className="loading"></span><span>전송 중...</span></>
                ) : ( "💌 보내기" )}
            </button>
            
            {feedback.message && <div className={`feedback-message ${feedback.type}`}>{feedback.message}</div>}

            {showResult && (
                <div className="result-section show">
                    <div className="message-card-wrapper">
                        <div className="message-card">
                            <div className="message-content">{message}</div>
                            <div className="message-author">- 마음 우체통에서</div>
                        </div>
                        <button 
                            className="speak-btn" 
                            onClick={handleSpeak} 
                            disabled={isFetchingAudio}
                            title={isSpeaking ? "재생 중지" : "음성으로 듣기"}
                        >
                            {isFetchingAudio ? (
                                <span className="loading">로딩 중...</span>
                            ) : isSpeaking ? (
                                <StopIcon />
                            ) : (
                                <SoundIcon />
                            )}
                        </button>
                        <button 
                            className="save-btn" 
                            onClick={handleSaveMessage}
                            disabled={isSaved}
                            title={isSaved ? "저장됨" : "메시지 저장"}
                        >
                            <BookmarkIcon />
                            {isSaved && <span className="saved-text">저장됨</span>}
                        </button>
                    </div>
                    <button className="reset-btn" onClick={resetForm}>
                        다시 쓰기
                    </button>
                </div>
            )}
        </div>
    );
};

export default MindPostbox;
