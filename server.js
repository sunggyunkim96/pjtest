// 1. 패키지 설치
// npm install mongodb dotenv

// 2. 환경 변수 설정 (.env 파일)
/*
COSMOS_DB_CONNECTION_STRING=mongodb://dbmoodpostbox:VKKAW8MSHr1cm0y5cyq0vDJkHo99WwK7tWaxXFCCLdhqit7r9MdcEHttyEUglqixcSlMZUPtZzc4ACDbB30mcg==@dbmoodpostbox.mongo.cosmos.azure.com:10255/?ssl=true&replicaSet=globaldb&retrywrites=false&maxIdleTimeMS=120000&appName=@dbmoodpostbox@
COSMOS_DB_NAME=dbmoodpostbox
NODE_ENV=production
*/

require('dotenv').config();
const { MongoClient, ServerApiVersion } = require('mongodb');

// 3. 연결 설정 클래스
class CosmosDBConnection {
    constructor() {
        this.client = null;
        this.db = null;
        this.isConnected = false;
        
        // 연결 옵션 설정
        this.options = {
            maxPoolSize: 10,          // 최대 연결 수
            serverSelectionTimeoutMS: 5000,  // 서버 선택 타임아웃
            socketTimeoutMS: 45000,   // 소켓 타임아웃
            family: 4,                // IPv4 사용
            retryWrites: false,       // Cosmos DB는 retryWrites를 지원하지 않음
            ssl: true,                // SSL 사용 필수
            serverApi: {
                version: ServerApiVersion.v1,
                strict: true,
                deprecationErrors: true,
            }
        };
    }

    // 4. 데이터베이스 연결 함수
    async connect() {
        try {
            if (this.isConnected && this.db) {
                console.log('이미 연결되어 있습니다.');
                return this.db;
            }

            const connectionString = process.env.COSMOS_DB_CONNECTION_STRING;
            if (!connectionString) {
                throw new Error('COSMOS_DB_CONNECTION_STRING 환경 변수가 설정되지 않았습니다.');
            }

            console.log('Cosmos DB에 연결 중...');
            this.client = new MongoClient(connectionString, this.options);
            
            // 연결 테스트
            await this.client.connect();
            await this.client.db("admin").command({ ping: 1 });
            
            this.db = this.client.db(process.env.COSMOS_DB_NAME);
            this.isConnected = true;
            
            console.log('Cosmos DB 연결 성공!');
            return this.db;
            
        } catch (error) {
            console.error('Cosmos DB 연결 실패:', error);
            this.isConnected = false;
            throw error;
        }
    }

    // 5. 연결 해제 함수
    async disconnect() {
        try {
            if (this.client) {
                await this.client.close();
                this.isConnected = false;
                this.client = null;
                this.db = null;
                console.log('Cosmos DB 연결이 해제되었습니다.');
            }
        } catch (error) {
            console.error('연결 해제 중 오류:', error);
        }
    }

    // 6. 연결 상태 확인
    async checkConnection() {
        try {
            if (!this.db) {
                return false;
            }
            await this.db.admin().ping();
            return true;
        } catch {
            return false;
        }
    }

    // 7. 재연결 함수
    async reconnect() {
        console.log('재연결을 시도합니다...');
        await this.disconnect();
        return await this.connect();
    }
}

// 8. 싱글톤 인스턴스 생성
const cosmosDB = new CosmosDBConnection();

// 9. Express.js 애플리케이션 예시
const express = require('express');
const app = express();
app.use(express.json());

// 10. 미들웨어: DB 연결 확인
const ensureDBConnection = async (req, res, next) => {
    try {
        if (!cosmosDB.isConnected) {
            await cosmosDB.connect();
        }
        
        // 연결 상태 재확인
        const isConnected = await cosmosDB.checkConnection();
        if (!isConnected) {
            await cosmosDB.reconnect();
        }
        
        req.db = cosmosDB.db;
        next();
    } catch (error) {
        console.error('DB 연결 미들웨어 오류:', error);
        res.status(500).json({ 
            error: 'Database connection failed',
            message: error.message 
        });
    }
};

// 11. API 라우트 예시들
app.get('/api/health', ensureDBConnection, async (req, res) => {
    try {
        const result = await req.db.admin().ping();
        res.json({ 
            status: 'healthy', 
            database: 'connected',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({ 
            status: 'unhealthy', 
            error: error.message 
        });
    }
});

// 사용자 생성
app.post('/api/users', ensureDBConnection, async (req, res) => {
    try {
        const { name, email } = req.body;
        const collection = req.db.collection('users');
        
        const newUser = {
            name,
            email,
            createdAt: new Date(),
            updatedAt: new Date()
        };
        
        const result = await collection.insertOne(newUser);
        res.status(201).json({
            success: true,
            userId: result.insertedId,
            user: newUser
        });
    } catch (error) {
        console.error('사용자 생성 오류:', error);
        res.status(500).json({ 
            error: 'Failed to create user',
            message: error.message 
        });
    }
});

// 사용자 조회
app.get('/api/users', ensureDBConnection, async (req, res) => {
    try {
        const collection = req.db.collection('users');
        const users = await collection.find({}).toArray();
        
        res.json({
            success: true,
            count: users.length,
            users
        });
    } catch (error) {
        console.error('사용자 조회 오류:', error);
        res.status(500).json({ 
            error: 'Failed to fetch users',
            message: error.message 
        });
    }
});

// 특정 사용자 조회
app.get('/api/users/:id', ensureDBConnection, async (req, res) => {
    try {
        const { ObjectId } = require('mongodb');
        const collection = req.db.collection('users');
        
        const user = await collection.findOne({ 
            _id: new ObjectId(req.params.id) 
        });
        
        if (!user) {
            return res.status(404).json({ 
                error: 'User not found' 
            });
        }
        
        res.json({
            success: true,
            user
        });
    } catch (error) {
        console.error('사용자 조회 오류:', error);
        res.status(500).json({ 
            error: 'Failed to fetch user',
            message: error.message 
        });
    }
});

// 12. 애플리케이션 시작
const PORT = process.env.PORT || 3000;

async function startServer() {
    try {
        // 서버 시작 전 DB 연결
        await cosmosDB.connect();
        
        app.listen(PORT, () => {
            console.log(`서버가 포트 ${PORT}에서 실행 중입니다.`);
        });
        
        // 13. 우아한 종료 처리
        process.on('SIGINT', async () => {
            console.log('서버를 종료합니다...');
            await cosmosDB.disconnect();
            process.exit(0);
        });
        
        process.on('SIGTERM', async () => {
            console.log('서버를 종료합니다...');
            await cosmosDB.disconnect();
            process.exit(0);
        });
        
    } catch (error) {
        console.error('서버 시작 실패:', error);
        process.exit(1);
    }
}

startServer();

// 14. 추가 유틸리티 함수들
class DatabaseUtils {
    // 컬렉션 인덱스 생성
    static async createIndexes(db) {
        try {
            await db.collection('users').createIndex({ email: 1 }, { unique: true });
            await db.collection('users').createIndex({ createdAt: -1 });
            console.log('인덱스가 생성되었습니다.');
        } catch (error) {
            console.error('인덱스 생성 실패:', error);
        }
    }
    
    // 집계 파이프라인 예시
    static async getUserStats(db) {
        const pipeline = [
            {
                $group: {
                    _id: null,
                    totalUsers: { $sum: 1 },
                    avgCreatedDate: { $avg: "$createdAt" }
                }
            }
        ];
        
        const result = await db.collection('users').aggregate(pipeline).toArray();
        return result[0];
    }
}

// 대시보드 통계 API
app.get('/api/dashboard/stats', ensureDBConnection, async (req, res) => {
    try {
        const stats = await DatabaseUtils.getDashboardStats(req.db);
        res.json({
            success: true,
            stats
        });
    } catch (error) {
        console.error('대시보드 통계 조회 오류:', error);
        res.status(500).json({ 
            error: 'Failed to fetch dashboard stats',
            message: error.message 
        });
    }
});

// Todo 삭제
app.delete('/api/todolist/:id', ensureDBConnection, async (req, res) => {
    try {
        const { ObjectId } = require('mongodb');
        const collection = req.db.collection('todolist');
        
        const result = await collection.deleteOne({ 
            _id: new ObjectId(req.params.id) 
        });
        
        if (result.deletedCount === 0) {
            return res.status(404).json({ 
                error: 'Todo not found' 
            });
        }
        
        res.json({
            success: true,
            message: 'Todo deleted successfully'
        });
    } catch (error) {
        console.error('Todo 삭제 오류:', error);
        res.status(500).json({ 
            error: 'Failed to delete todo',
            message: error.message 
        });
    }
});

// 사용자 정보 수정
app.put('/api/users/userinfo/:id', ensureDBConnection, async (req, res) => {
    try {
        const { ObjectId } = require('mongodb');
        const { name, email, phone, address } = req.body;
        const collection = req.db.collection('userinfo');
        
        const result = await collection.updateOne(
            { _id: new ObjectId(req.params.id) },
            { 
                $set: { 
                    name,
                    email,
                    phone,
                    address,
                    updatedAt: new Date()
                }
            }
        );
        
        if (result.matchedCount === 0) {
            return res.status(404).json({ 
                error: 'User not found' 
            });
        }
        
        res.json({
            success: true,
            message: 'User updated successfully'
        });
    } catch (error) {
        console.error('사용자 정보 수정 오류:', error);
        res.status(500).json({ 
            error: 'Failed to update user',
            message: error.message 
        });
    }
});

// 사용자 정보 삭제
app.delete('/api/users/userinfo/:id', ensureDBConnection, async (req, res) => {
    try {
        const { ObjectId } = require('mongodb');
        const collection = req.db.collection('userinfo');
        
        const result = await collection.deleteOne({ 
            _id: new ObjectId(req.params.id) 
        });
        
        if (result.deletedCount === 0) {
            return res.status(404).json({ 
                error: 'User not found' 
            });
        }
        
        res.json({
            success: true,
            message: 'User deleted successfully'
        });
    } catch (error) {
        console.error('사용자 정보 삭제 오류:', error);
        res.status(500).json({ 
            error: 'Failed to delete user',
            message: error.message 
        });
    }
});
