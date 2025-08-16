const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// 中间件
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// 确保必要的目录存在
const uploadsDir = path.join(__dirname, 'uploads');
const dataDir = path.join(__dirname, 'data');

if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

// 音乐数据文件路径
const musicDataFile = path.join(dataDir, 'music.json');

// 初始化音乐数据文件
if (!fs.existsSync(musicDataFile)) {
    fs.writeFileSync(musicDataFile, JSON.stringify([], null, 2));
}

// 配置 multer 用于文件上传
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadsDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ 
    storage: storage,
    fileFilter: function (req, file, cb) {
        // 只允许音频文件
        if (file.mimetype.startsWith('audio/')) {
            cb(null, true);
        } else {
            cb(new Error('只允许上传音频文件！'), false);
        }
    },
    limits: {
        fileSize: 200 * 1024 * 1024 // 200MB 限制
    }
});

// 读取音乐数据
function readMusicData() {
    try {
        const data = fs.readFileSync(musicDataFile, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('读取音乐数据失败:', error);
        return [];
    }
}

// 写入音乐数据
function writeMusicData(data) {
    try {
        fs.writeFileSync(musicDataFile, JSON.stringify(data, null, 2));
        return true;
    } catch (error) {
        console.error('写入音乐数据失败:', error);
        return false;
    }
}

// API 路由

// 获取所有音乐
app.get('/api/music', (req, res) => {
    const musicData = readMusicData();
    res.json({
        success: true,
        data: musicData
    });
});

// 上传音乐文件
app.post('/api/music/upload', upload.single('musicFile'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: '没有上传文件'
            });
        }

        const { title, artist, album } = req.body;
        
        const musicData = readMusicData();
        const newMusic = {
            id: Date.now().toString(),
            title: title || path.parse(req.file.originalname).name,
            artist: artist || '未知艺术家',
            album: album || '未知专辑',
            filename: req.file.filename,
            originalName: req.file.originalname,
            path: `/uploads/${req.file.filename}`,
            size: req.file.size,
            uploadTime: new Date().toISOString()
        };

        musicData.push(newMusic);
        
        if (writeMusicData(musicData)) {
            res.json({
                success: true,
                message: '音乐上传成功',
                data: newMusic
            });
        } else {
            res.status(500).json({
                success: false,
                message: '保存音乐信息失败'
            });
        }
    } catch (error) {
        console.error('上传音乐失败:', error);
        res.status(500).json({
            success: false,
            message: '上传失败: ' + error.message
        });
    }
});

// 删除音乐
app.delete('/api/music/:id', (req, res) => {
    try {
        const musicId = req.params.id;
        const musicData = readMusicData();
        
        const musicIndex = musicData.findIndex(music => music.id === musicId);
        if (musicIndex === -1) {
            return res.status(404).json({
                success: false,
                message: '音乐不存在'
            });
        }

        const music = musicData[musicIndex];
        const filePath = path.join(uploadsDir, music.filename);
        
        // 删除文件
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
        
        // 从数据中删除
        musicData.splice(musicIndex, 1);
        
        if (writeMusicData(musicData)) {
            res.json({
                success: true,
                message: '音乐删除成功'
            });
        } else {
            res.status(500).json({
                success: false,
                message: '删除音乐信息失败'
            });
        }
    } catch (error) {
        console.error('删除音乐失败:', error);
        res.status(500).json({
            success: false,
            message: '删除失败: ' + error.message
        });
    }
});

// 更新音乐信息
app.put('/api/music/:id', (req, res) => {
    try {
        const musicId = req.params.id;
        const { title, artist, album } = req.body;
        const musicData = readMusicData();
        
        const musicIndex = musicData.findIndex(music => music.id === musicId);
        if (musicIndex === -1) {
            return res.status(404).json({
                success: false,
                message: '音乐不存在'
            });
        }

        // 更新音乐信息
        if (title) musicData[musicIndex].title = title;
        if (artist) musicData[musicIndex].artist = artist;
        if (album) musicData[musicIndex].album = album;
        musicData[musicIndex].updateTime = new Date().toISOString();
        
        if (writeMusicData(musicData)) {
            res.json({
                success: true,
                message: '音乐信息更新成功',
                data: musicData[musicIndex]
            });
        } else {
            res.status(500).json({
                success: false,
                message: '更新音乐信息失败'
            });
        }
    } catch (error) {
        console.error('更新音乐失败:', error);
        res.status(500).json({
            success: false,
            message: '更新失败: ' + error.message
        });
    }
});

// 提供音乐文件访问 - 彻底修复CORS问题
app.use('/uploads', (req, res, next) => {
    // 设置CORS头
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Range');
    res.header('Access-Control-Expose-Headers', 'Content-Range, Accept-Ranges, Content-Length');
    
    // 支持音频流
    res.header('Accept-Ranges', 'bytes');
    
    // 关键：允许跨域凭证，解决Web Audio API的CORS问题
    res.header('Access-Control-Allow-Credentials', 'true');
    
    // 处理OPTIONS预检请求
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    next();
}, express.static(uploadsDir, {
    // 启用范围请求支持
    acceptRanges: true,
    // 设置正确的MIME类型
    setHeaders: (res, path) => {
        // 为所有音频文件添加CORS头
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Credentials', 'true');
        
        // 设置正确的MIME类型
        if (path.endsWith('.flac')) {
            res.setHeader('Content-Type', 'audio/flac');
        } else if (path.endsWith('.mp3')) {
            res.setHeader('Content-Type', 'audio/mpeg');
        } else if (path.endsWith('.m4a')) {
            res.setHeader('Content-Type', 'audio/mp4');
        } else if (path.endsWith('.wav')) {
            res.setHeader('Content-Type', 'audio/wav');
        } else if (path.endsWith('.ogg')) {
            res.setHeader('Content-Type', 'audio/ogg');
        }
    }
}));

// 根路径路由 - 提供简单的欢迎页面
app.get('/', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html lang="zh-CN">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>AppieMusic 后端服务</title>
            <style>
                body { font-family: Arial, sans-serif; max-width: 800px; margin: 50px auto; padding: 20px; background: #f5f5f5; }
                .container { background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
                h1 { color: #4ecca3; text-align: center; }
                .status { background: #d4edda; color: #155724; padding: 15px; border-radius: 5px; margin: 20px 0; }
                .api-list { background: #f8f9fa; padding: 15px; border-radius: 5px; }
                .api-item { margin: 10px 0; font-family: monospace; }
                a { color: #4ecca3; text-decoration: none; }
                a:hover { text-decoration: underline; }
            </style>
        </head>
        <body>
            <div class="container">
                <h1>🎵 AppieMusic 后端服务</h1>
                <div class="status">
                    ✅ 服务器运行正常<br>
                    📁 音乐文件存储目录: ${uploadsDir}<br>
                    💾 数据文件位置: ${musicDataFile}
                </div>
                
                <h2>可用的 API 接口：</h2>
                <div class="api-list">
                    <div class="api-item">GET /api/music - 获取所有音乐</div>
                    <div class="api-item">POST /api/music/upload - 上传音乐文件</div>
                    <div class="api-item">DELETE /api/music/:id - 删除音乐</div>
                    <div class="api-item">PUT /api/music/:id - 更新音乐信息</div>
                </div>
                
                <h2>使用说明：</h2>
                <p>1. 在浏览器中打开 <strong>AppieMusic - v1.3.html</strong> 文件</p>
                <p>2. 或者访问 <a href="/test-api.html">API 测试页面</a> 测试接口功能</p>
                
                <h2>快速测试：</h2>
                <p><a href="/api/music">点击这里查看音乐列表 API</a></p>
            </div>
        </body>
        </html>
    `);
});

// 提供测试页面
app.get('/test-api.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'test-api.html'));
});

// 错误处理中间件
app.use((error, req, res, next) => {
    if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
                success: false,
                message: '文件大小超过限制（最大50MB）'
            });
        }
    }
    
    res.status(500).json({
        success: false,
        message: error.message || '服务器内部错误'
    });
});

// 启动服务器
app.listen(PORT, () => {
    console.log(`AppieMusic 后端服务运行在 http://localhost:${PORT}`);
    console.log(`音乐文件存储目录: ${uploadsDir}`);
    console.log(`数据文件位置: ${musicDataFile}`);
});