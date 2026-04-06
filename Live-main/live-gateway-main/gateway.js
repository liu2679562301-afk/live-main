const express = require('express');
const app = express();
const cors = require('cors');
const https = require('https');
const http = require('http');
const { v4: uuidv4 } = require('uuid');
const serverCfg = require('./config/server-mode.node.js');
const { getCurrentServerConfig, printConfig } = serverCfg;

const currentConfig = getCurrentServerConfig();
const port = currentConfig.port; // 鐩存帴浣跨敤閰嶇疆涓殑绔彛锛坢ock鍜岄潪mock妯″紡閮藉凡閰嶇疆涓?080锛?
// ==================== WebSocket 鏀寔 ====================
// 灏濊瘯鍔犺浇 ws 妯″潡锛堝鏋滄湭瀹夎闇€瑕佽繍琛? npm install ws锛?let WebSocketServer;
try {
	const ws = require('ws');
	WebSocketServer = ws.WebSocketServer;
} catch (error) {
	console.warn('鈿狅笍  WebSocket 妯″潡鏈畨瑁咃紝瀹炴椂閫氫俊鍔熻兘灏嗕笉鍙敤銆傝杩愯: npm install ws');
	WebSocketServer = null;
}

// WebSocket 瀹㈡埛绔繛鎺ユ睜
const wsClients = new Set();

// 鍒涘缓 HTTP 鏈嶅姟鍣紙鐢ㄤ簬鏀寔 WebSocket锛?const server = http.createServer(app);
let wss = null;

if (WebSocketServer) {
	wss = new WebSocketServer({ server, path: '/ws' });
	
	wss.on('connection', (ws, req) => {
		console.log('鉁?WebSocket 瀹㈡埛绔凡杩炴帴:', req.socket.remoteAddress);
		wsClients.add(ws);
		
		// 发送欢迎消息和当前状态
		ws.send(JSON.stringify({
			type: 'connected',
			message: 'Connected to real-time data service'
		}));
		
		// 鍙戦€佸綋鍓嶇姸鎬?		broadcastCurrentState(ws);
		
		ws.on('message', (message) => {
			try {
				const data = JSON.parse(message);
				handleWebSocketMessage(ws, data);
			} catch (error) {
				console.error('WebSocket 娑堟伅瑙ｆ瀽澶辫触:', error);
			}
		});
		
		ws.on('close', () => {
			console.log('鉂?WebSocket 瀹㈡埛绔凡鏂紑');
			wsClients.delete(ws);
		});
		
		ws.on('error', (error) => {
			console.error('WebSocket 閿欒:', error);
			wsClients.delete(ws);
		});
	});
}

// WebSocket 娑堟伅澶勭悊
function handleWebSocketMessage(ws, data) {
	switch (data.type) {
		case 'ping':
			ws.send(JSON.stringify({ type: 'pong' }));
			break;
		case 'control-live':
			// 鍚庡彴绠＄悊绯荤粺鎺у埗鐩存挱鐘舵€?			handleLiveControl(data);
			break;
		case 'update-debate':
			// 鍚庡彴绠＄悊绯荤粺鏇存柊杈╄璁剧疆
			handleDebateUpdate(data);
			break;
		default:
			console.log('鏈煡鐨?WebSocket 娑堟伅绫诲瀷:', data.type);
	}
}

// 骞挎挱娑堟伅缁欐墍鏈夊鎴风
function broadcast(type, data) {
	if (!wss || wsClients.size === 0) return;
	
	const message = JSON.stringify({ type, data, timestamp: Date.now() });
	
	// 绉婚櫎宸插叧闂殑杩炴帴
	wsClients.forEach(client => {
		if (client.readyState === 1) { // WebSocket.OPEN
			client.send(message);
		} else {
			wsClients.delete(client);
		}
	});
}

// 骞挎挱褰撳墠鐘舵€侊紙鐢ㄤ簬鏂拌繛鎺ワ級
function broadcastCurrentState(ws) {
	if (!ws || ws.readyState !== 1) return;
	
	try {
		const db = require('../admin/db.js');
		const dashboard = db.statistics.getDashboard();
		const debate = db.debate.get();
		
		ws.send(JSON.stringify({
			type: 'state',
			data: {
				votes: currentVotes,
				debate: debate,
				dashboard: dashboard,
				liveStatus: dashboard.isLive
			},
			timestamp: Date.now()
		}));
	} catch (error) {
		console.error('鍙戦€佸綋鍓嶇姸鎬佸け璐?', error);
	}
}

// 澶勭悊鐩存挱鎺у埗
function handleLiveControl(data) {
	try {
		const db = require('../admin/db.js');
		const { action } = data; // 'start' 鎴?'stop'
		
		if (action === 'start') {
			// 寮€鍚洿鎾?			const activeStream = db.streams.getActive();
			if (activeStream) {
				broadcast('live-status-changed', {
					status: 'started',
					streamUrl: activeStream.url,
					timestamp: Date.now()
				});
			}
		} else if (action === 'stop') {
			// 鍋滄鐩存挱
			broadcast('live-status-changed', {
				status: 'stopped',
				timestamp: Date.now()
			});
		}
	} catch (error) {
		console.error('澶勭悊鐩存挱鎺у埗澶辫触:', error);
	}
}

// 澶勭悊杈╄璁剧疆鏇存柊
function handleDebateUpdate(data) {
	// 杩欎釜鍔熻兘宸茬粡閫氳繃 REST API 瀹炵幇浜嗭紝杩欓噷鍙互娣诲姞棰濆鐨勫疄鏃堕€氱煡
	broadcast('debate-updated', {
		debate: data.debate,
		timestamp: Date.now()
	});
}

// CORS 閰嶇疆 - 鍏佽鎵€鏈夋潵婧愶紙寮€鍙戠幆澧冿級
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    credentials: true
}));
app.use(express.json({ limit: '10mb', strict: false }));

// ==================== 鍚庡彴绠＄悊璺敱锛堝繀椤诲湪浠ｇ悊涔嬪墠锛?====================
const path = require('path');

// 鎻愪緵鍚庡彴绠＄悊椤甸潰
app.get('/admin', (req, res) => {
	res.sendFile(path.join(__dirname, 'admin', 'index.html'));
});

// 鎻愪緵鍚庡彴绠＄悊闈欐€佽祫婧?app.use('/admin', express.static(path.join(__dirname, 'admin')));
// ==================== 鍚庡彴绠＄悊璺敱缁撴潫 ====================

// ==================== 鍚庡彴绠＄悊 API锛堝繀椤诲湪浠ｇ悊涔嬪墠锛?====================
const db = require('../admin/db.js');

// 绠＄悊API - 鐩存挱娴佺鐞嗭紙瀹屾暣瀹炵幇瑙佷笅鏂?==================== 鐩存挱娴佺鐞嗘帴鍙?==================== 閮ㄥ垎锛?
// 绠＄悊API - 杈╄璁剧疆
app.get('/api/admin/debate', (req, res) => {
	try {
		const debate = db.debate.get();
		res.json(debate);
	} catch (error) {
		console.error('鑾峰彇杈╄璁剧疆澶辫触:', error);
		res.status(500).json({ error: '鑾峰彇澶辫触' });
	}
});

app.put('/api/admin/debate', (req, res) => {
	try {
		const debate = db.debate.update(req.body);
		// 鍚屾鏇存柊鍐呭瓨涓殑杈╅
		debateTopic.title = debate.title;
		debateTopic.description = debate.description;
		
		// 骞挎挱杈╄璁剧疆鏇存柊缁欐墍鏈夊鎴风锛堝寘鎷皬绋嬪簭锛?		broadcast('debate-updated', {
			debate: debate,
			timestamp: Date.now()
		});
		
		res.json(debate);
	} catch (error) {
		console.error('鏇存柊杈╄璁剧疆澶辫触:', error);
		res.status(500).json({ error: '鏇存柊澶辫触' });
	}
});

// 绠＄悊API - 鐢ㄦ埛绠＄悊
app.get('/api/admin/users', (req, res) => {
	try {
		const users = db.users.getAll();
		res.json(users);
	} catch (error) {
		console.error('鑾峰彇鐢ㄦ埛鍒楄〃澶辫触:', error);
		res.status(500).json({ error: '鑾峰彇澶辫触' });
	}
});

app.get('/api/admin/users/:id', (req, res) => {
	try {
		const user = db.users.getById(req.params.id);
		if (!user) {
			return res.status(404).json({ error: '鐢ㄦ埛涓嶅瓨鍦? });
		}
		res.json(user);
	} catch (error) {
		console.error('鑾峰彇鐢ㄦ埛澶辫触:', error);
		res.status(500).json({ error: '鑾峰彇澶辫触' });
	}
});

// 鑾峰彇褰撳墠杈╅锛堝皬绋嬪簭璋冪敤锛? 瀹屾暣瀹炵幇瑙佷笅鏂?API璺敱 閮ㄥ垎

// 娣诲姞鐩存挱鐘舵€佹帶鍒?API
let globalLiveStatus = {
	isLive: false,
	streamUrl: null,
	scheduledStartTime: null,
	scheduledEndTime: null,
	streamId: null,
	isScheduled: false,
	liveId: null,
	startTime: null
};

// 姣忎釜娴佺殑鐙珛鐩存挱鐘舵€侊紙鏀寔澶氭祦鍚屾椂绠＄悊锛?// 鏍煎紡: { streamId: { isLive: true/false, liveId: 'xxx', startTime: 'xxx', streamUrl: 'xxx' } }
let streamLiveStatuses = {};

// 娣诲姞AI璇嗗埆鐘舵€佺鐞?let globalAIStatus = {
	status: 'stopped',  // stopped / running / paused
	aiSessionId: null,
	startTime: null,
	settings: {
		mode: 'realtime',
		interval: 5000,
		sensitivity: 'high',
		minConfidence: 0.7
	},
	statistics: {
		totalContents: 0,
		totalWords: 0,
		averageConfidence: 0
	}
};

// 瀹氭椂妫€鏌ョ洿鎾鍒?let liveScheduleTimer = null;

function checkLiveSchedule() {
	const db = require('../admin/db.js');
	const schedule = db.liveSchedule.get();
	const now = Date.now();
	
	if (schedule.isScheduled && schedule.scheduledStartTime) {
		const startTime = new Date(schedule.scheduledStartTime).getTime();
		
		// 濡傛灉鍒颁簡寮€濮嬫椂闂翠笖杩樻湭寮€濮?		if (now >= startTime && !globalLiveStatus.isLive) {
			console.log('鈴?瀹氭椂寮€濮嬬洿鎾?);
			startScheduledLive(schedule);
		}
		
		// 濡傛灉鏈夌粨鏉熸椂闂翠笖宸插埌缁撴潫鏃堕棿
		if (schedule.scheduledEndTime && globalLiveStatus.isLive) {
			const endTime = new Date(schedule.scheduledEndTime).getTime();
			if (now >= endTime) {
				console.log('鈴?瀹氭椂缁撴潫鐩存挱');
				stopLive();
			}
		}
	}
}

// 鍚姩瀹氭椂妫€鏌ワ紙姣忓垎閽熸鏌ヤ竴娆★級
function startScheduleCheck() {
	if (liveScheduleTimer) {
		clearInterval(liveScheduleTimer);
	}
	liveScheduleTimer = setInterval(checkLiveSchedule, 60000); // 姣忓垎閽熸鏌ヤ竴娆?}

// 鍚姩璁″垝鐨勭洿鎾?function startScheduledLive(schedule) {
	const db = require('../admin/db.js');
	
	try {
		let streamUrl = null;
		
		// 鑾峰彇鐩存挱娴?		if (schedule.streamId) {
			const stream = db.streams.getById(schedule.streamId);
			if (stream && stream.enabled) {
				streamUrl = stream.url;
			}
		}
		
		if (!streamUrl) {
			const activeStream = db.streams.getActive();
			if (activeStream) {
				streamUrl = activeStream.url;
			}
		}
		
		if (!streamUrl) {
			console.error('鉂?娌℃湁鍙敤鐨勭洿鎾祦');
			return;
		}
		
		globalLiveStatus.isLive = true;
		globalLiveStatus.streamUrl = streamUrl;
		globalLiveStatus.streamId = schedule.streamId;
		
		// 骞挎挱鐩存挱鐘舵€佸彉鍖?		broadcast('live-status-changed', {
			status: 'started',
			streamUrl: globalLiveStatus.streamUrl,
			timestamp: Date.now(),
			scheduled: true
		});
		
		console.log('鉁?鐩存挱宸插紑濮?', streamUrl);
	} catch (error) {
		console.error('鍚姩璁″垝鐩存挱澶辫触:', error);
	}
}

// 鍋滄鐩存挱
function stopLive() {
	globalLiveStatus.isLive = false;
	globalLiveStatus.streamUrl = null;
	globalLiveStatus.streamId = null;
	
	// 娓呴櫎璁″垝
	const db = require('../admin/db.js');
	db.liveSchedule.clear();
	globalLiveStatus.isScheduled = false;
	globalLiveStatus.scheduledStartTime = null;
	globalLiveStatus.scheduledEndTime = null;
	
	// 骞挎挱鐩存挱鐘舵€佸彉鍖?	broadcast('live-status-changed', {
		status: 'stopped',
		timestamp: Date.now()
	});
	
		console.log('馃洃 鐩存挱宸插仠姝?);
}

// 绠＄悊绔洿鎾帶鍒舵帴鍙ｏ紙绠＄悊鍛樹笓鐢級
app.post('/api/admin/live/control', (req, res) => {
	try {
		const { action, streamUrl } = req.body;
		
		if (action === 'start') {
			if (!streamUrl) {
				const db = require('../admin/db.js');
				const activeStream = db.streams.getActive();
				if (!activeStream) {
					return res.status(400).json({ error: '娌℃湁鍙敤鐨勭洿鎾祦' });
				}
				globalLiveStatus.streamUrl = activeStream.url;
			} else {
				globalLiveStatus.streamUrl = streamUrl;
			}
			globalLiveStatus.isLive = true;
			
			// 骞挎挱鐩存挱鐘舵€佸彉鍖?			broadcast('live-status-changed', {
				status: 'started',
				streamUrl: globalLiveStatus.streamUrl,
				timestamp: Date.now()
			});
			
			res.json({ success: true, status: 'started', streamUrl: globalLiveStatus.streamUrl });
		} else if (action === 'stop') {
			stopLive();
			res.json({ success: true, status: 'stopped' });
		} else {
			res.status(400).json({ error: '鏃犳晥鐨勬搷浣? });
		}
	} catch (error) {
		console.error('鎺у埗鐩存挱鐘舵€佸け璐?', error);
		res.status(500).json({ error: '鎿嶄綔澶辫触' });
	}
});

// 鍏紑鐨勭洿鎾帶鍒舵帴鍙ｏ紙鐢ㄦ埛鍙洿鎺ヨ皟鐢級
app.post('/api/live/control', (req, res) => {
	try {
		const { action, streamId } = req.body;
		
		if (action === 'start') {
			const db = require('../admin/db.js');
			let selectedStream = null;
			
			// 濡傛灉鎸囧畾浜唖treamId锛屼娇鐢ㄦ寚瀹氱殑鐩存挱娴?			if (streamId) {
				selectedStream = db.streams.getById(streamId);
				if (!selectedStream) {
					return res.status(400).json({ 
						success: false,
						message: '鎸囧畾鐨勭洿鎾祦涓嶅瓨鍦? 
					});
				}
				if (!selectedStream.enabled) {
					return res.status(400).json({ 
						success: false,
						message: '鎸囧畾鐨勭洿鎾祦鏈惎鐢? 
					});
				}
			} else {
				// 鍚﹀垯浣跨敤鍚敤鐨勭洿鎾祦
				selectedStream = db.streams.getActive();
				if (!selectedStream) {
					return res.status(400).json({ 
						success: false,
						message: '娌℃湁鍙敤鐨勭洿鎾祦锛岃鍏堝湪鍚庡彴绠＄悊绯荤粺涓厤缃洿鎾祦' 
					});
				}
			}
			
			// 寮€濮嬬洿鎾?			globalLiveStatus.isLive = true;
			globalLiveStatus.streamUrl = selectedStream.url;
			globalLiveStatus.streamId = selectedStream.id;
			globalLiveStatus.isScheduled = false;
			globalLiveStatus.scheduledStartTime = null;
			globalLiveStatus.scheduledEndTime = null;
			
			// 娓呴櫎涔嬪墠鐨勮鍒?			db.liveSchedule.clear();
			
			// 骞挎挱鐩存挱鐘舵€佸彉鍖?			broadcast('live-status-changed', {
				status: 'started',
				streamUrl: globalLiveStatus.streamUrl,
				timestamp: Date.now(),
				startedBy: 'user'
			});
			
			console.log('鉁?鐢ㄦ埛鍚姩鐩存挱:', selectedStream.name, selectedStream.url);
			
			res.json({ 
				success: true, 
				message: '鐩存挱宸插紑濮?,
				data: {
					status: 'started',
					streamUrl: globalLiveStatus.streamUrl,
					streamId: selectedStream.id,
					streamName: selectedStream.name
				}
			});
		} else if (action === 'stop') {
			stopLive();
			console.log('鉁?鐢ㄦ埛鍋滄鐩存挱');
			res.json({ 
				success: true, 
				message: '鐩存挱宸插仠姝?,
				data: {
					status: 'stopped'
				}
			});
		} else {
			res.status(400).json({ 
				success: false,
				message: '鏃犳晥鐨勬搷浣滐紝action 蹇呴』鏄?"start" 鎴?"stop"' 
			});
		}
	} catch (error) {
		console.error('鐢ㄦ埛鎺у埗鐩存挱鐘舵€佸け璐?', error);
		res.status(500).json({ 
			success: false,
			message: '鎿嶄綔澶辫触: ' + error.message 
		});
	}
});

// 璁剧疆鐩存挱璁″垝
app.post('/api/admin/live/schedule', (req, res) => {
	try {
		const db = require('../admin/db.js');
		const { scheduledStartTime, scheduledEndTime, streamId } = req.body;
		
		if (!scheduledStartTime) {
			return res.status(400).json({ error: '璇疯缃洿鎾紑濮嬫椂闂? });
		}
		
		const startTime = new Date(scheduledStartTime).getTime();
		const now = Date.now();
		
		if (startTime <= now) {
			return res.status(400).json({ error: '寮€濮嬫椂闂村繀椤绘櫄浜庡綋鍓嶆椂闂? });
		}
		
		// 楠岃瘉鐩存挱娴?		if (streamId) {
			const stream = db.streams.getById(streamId);
			if (!stream) {
				return res.status(400).json({ error: '鎸囧畾鐨勭洿鎾祦涓嶅瓨鍦? });
			}
			if (!stream.enabled) {
				return res.status(400).json({ error: '鎸囧畾鐨勭洿鎾祦鏈惎鐢? });
			}
		} else {
			const activeStream = db.streams.getActive();
			if (!activeStream) {
				return res.status(400).json({ error: '娌℃湁鍙敤鐨勭洿鎾祦' });
			}
		}
		
		// 淇濆瓨璁″垝
		const schedule = db.liveSchedule.update({
			scheduledStartTime,
			scheduledEndTime: scheduledEndTime || null,
			streamId: streamId || null,
			isScheduled: true
		});
		
		globalLiveStatus.scheduledStartTime = scheduledStartTime;
		globalLiveStatus.scheduledEndTime = scheduledEndTime || null;
		globalLiveStatus.streamId = streamId || null;
		globalLiveStatus.isScheduled = true;
		
		// 鍚姩瀹氭椂妫€鏌?		startScheduleCheck();
		
		// 骞挎挱璁″垝鏇存柊
		broadcast('live-schedule-updated', {
			schedule: schedule,
			timestamp: Date.now()
		});
		
		res.json({
			success: true,
			message: '鐩存挱璁″垝宸茶缃?,
			data: schedule
		});
	} catch (error) {
		console.error('璁剧疆鐩存挱璁″垝澶辫触:', error);
		res.status(500).json({ error: '璁剧疆澶辫触' });
	}
});

// 鑾峰彇鐩存挱璁″垝
app.get('/api/admin/live/schedule', (req, res) => {
	try {
		const db = require('../admin/db.js');
		const schedule = db.liveSchedule.get();
		res.json({
			success: true,
			data: schedule
		});
	} catch (error) {
		res.status(500).json({ error: '鑾峰彇澶辫触' });
	}
});

// 鍙栨秷鐩存挱璁″垝
app.post('/api/admin/live/schedule/cancel', (req, res) => {
	try {
		const db = require('../admin/db.js');
		db.liveSchedule.clear();
		
		globalLiveStatus.isScheduled = false;
		globalLiveStatus.scheduledStartTime = null;
		globalLiveStatus.scheduledEndTime = null;
		
		// 骞挎挱璁″垝鍙栨秷
		broadcast('live-schedule-cancelled', {
			timestamp: Date.now()
		});
		
		res.json({
			success: true,
			message: '鐩存挱璁″垝宸插彇娑?
		});
	} catch (error) {
		res.status(500).json({ error: '鍙栨秷澶辫触' });
	}
});

app.get('/api/admin/live/status', (req, res) => {
	try {
		const db = require('../admin/db.js');
		const schedule = db.liveSchedule.get();
		
		// 鑾峰彇鍚敤鐨勭洿鎾祦锛堝嵆浣跨洿鎾湭寮€濮嬶紝涔熻繑鍥炲惎鐢ㄧ殑娴佸湴鍧€锛?		let activeStream = null;
		try {
			activeStream = db.streams.getActive();
		} catch (error) {
			console.warn('鑾峰彇鍚敤鐩存挱娴佸け璐?', error);
		}
		
		res.json({
			...globalLiveStatus,
			schedule: schedule,
			// 濡傛灉鐩存挱鏈紑濮嬩絾鏈夊惎鐢ㄧ殑娴侊紝杩斿洖娴佸湴鍧€浠ヤ究灏忕▼搴忎娇鐢?			activeStreamUrl: activeStream ? activeStream.url : null,
			activeStreamId: activeStream ? activeStream.id : null,
			activeStreamName: activeStream ? activeStream.name : null
		});
	} catch (error) {
		res.json(globalLiveStatus);
	}
});

// 涓€娆℃€ц缃苟寮€濮嬬洿鎾紙鏁村悎API锛?app.post('/api/admin/live/setup-and-start', (req, res) => {
	try {
		const db = require('../admin/db.js');
		const { streamId, scheduledStartTime, scheduledEndTime, startNow } = req.body;
		
		// 楠岃瘉鐩存挱娴?		let selectedStream = null;
		if (streamId) {
			selectedStream = db.streams.getById(streamId);
			if (!selectedStream) {
				return res.status(400).json({ error: '鎸囧畾鐨勭洿鎾祦涓嶅瓨鍦? });
			}
			if (!selectedStream.enabled) {
				return res.status(400).json({ error: '鎸囧畾鐨勭洿鎾祦鏈惎鐢? });
			}
		} else {
			selectedStream = db.streams.getActive();
			if (!selectedStream) {
				return res.status(400).json({ error: '娌℃湁鍙敤鐨勭洿鎾祦' });
			}
		}
		
		if (startNow) {
			// 绔嬪嵆寮€濮嬬洿鎾?			globalLiveStatus.isLive = true;
			globalLiveStatus.streamUrl = selectedStream.url;
			globalLiveStatus.streamId = selectedStream.id;
			globalLiveStatus.isScheduled = false;
			globalLiveStatus.scheduledStartTime = null;
			globalLiveStatus.scheduledEndTime = null;
			
			// 娓呴櫎涔嬪墠鐨勮鍒?			db.liveSchedule.clear();
			
			// 骞挎挱鐩存挱鐘舵€佸彉鍖?			broadcast('live-status-changed', {
				status: 'started',
				streamUrl: globalLiveStatus.streamUrl,
				timestamp: Date.now(),
				startedBy: 'admin'
			});
			
			res.json({
				success: true,
				message: '鐩存挱宸插紑濮?,
				data: {
					isLive: true,
					streamUrl: globalLiveStatus.streamUrl,
					streamId: selectedStream.id
				}
			});
		} else {
			// 璁剧疆瀹氭椂寮€濮?			if (!scheduledStartTime) {
				return res.status(400).json({ error: '璇疯缃洿鎾紑濮嬫椂闂? });
			}
			
			const startTime = new Date(scheduledStartTime).getTime();
			const now = Date.now();
			
			if (startTime <= now) {
				return res.status(400).json({ error: '寮€濮嬫椂闂村繀椤绘櫄浜庡綋鍓嶆椂闂? });
			}
			
			// 淇濆瓨璁″垝
			const schedule = db.liveSchedule.update({
				scheduledStartTime,
				scheduledEndTime: scheduledEndTime || null,
				streamId: selectedStream.id,
				isScheduled: true
			});
			
			globalLiveStatus.scheduledStartTime = scheduledStartTime;
			globalLiveStatus.scheduledEndTime = scheduledEndTime || null;
			globalLiveStatus.streamId = selectedStream.id;
			globalLiveStatus.isScheduled = true;
			
			// 鍚姩瀹氭椂妫€鏌?			startScheduleCheck();
			
			// 骞挎挱璁″垝鏇存柊
			broadcast('live-schedule-updated', {
				schedule: schedule,
				timestamp: Date.now()
			});
			
			res.json({
				success: true,
				message: '鐩存挱璁″垝宸茶缃?,
				data: schedule
			});
		}
	} catch (error) {
		console.error('璁剧疆骞跺紑濮嬬洿鎾け璐?', error);
		res.status(500).json({ error: '鎿嶄綔澶辫触' });
	}
});

// ==================== 绁ㄦ暟绠＄悊 API ====================
app.get('/api/admin/votes', (req, res) => {
	try {
		res.json({
			success: true,
			data: {
				leftVotes: currentVotes.leftVotes,
				rightVotes: currentVotes.rightVotes,
				totalVotes: currentVotes.leftVotes + currentVotes.rightVotes,
				leftPercentage: currentVotes.leftVotes + currentVotes.rightVotes > 0
					? Math.round((currentVotes.leftVotes / (currentVotes.leftVotes + currentVotes.rightVotes)) * 100)
					: 50,
				rightPercentage: currentVotes.leftVotes + currentVotes.rightVotes > 0
					? Math.round((currentVotes.rightVotes / (currentVotes.leftVotes + currentVotes.rightVotes)) * 100)
					: 50
			}
		});
	} catch (error) {
		res.status(500).json({ error: '鑾峰彇绁ㄦ暟澶辫触' });
	}
});

app.put('/api/admin/votes', (req, res) => {
	try {
		const { leftVotes, rightVotes } = req.body;
		
		if (typeof leftVotes !== 'undefined' && typeof leftVotes !== 'number') {
			return res.status(400).json({ error: 'leftVotes 蹇呴』鏄暟瀛? });
		}
		if (typeof rightVotes !== 'undefined' && typeof rightVotes !== 'number') {
			return res.status(400).json({ error: 'rightVotes 蹇呴』鏄暟瀛? });
		}
		if ((typeof leftVotes !== 'undefined' && leftVotes < 0) || (typeof rightVotes !== 'undefined' && rightVotes < 0)) {
			return res.status(400).json({ error: '绁ㄦ暟涓嶈兘涓鸿礋鏁? });
		}
		
		if (typeof leftVotes !== 'undefined') {
			currentVotes.leftVotes = leftVotes;
		}
		if (typeof rightVotes !== 'undefined') {
			currentVotes.rightVotes = rightVotes;
		}
		
		// 骞挎挱绁ㄦ暟鏇存柊
		const totalVotes = currentVotes.leftVotes + currentVotes.rightVotes;
		broadcast('vote-updated', {
			votes: {
				leftVotes: currentVotes.leftVotes,
				rightVotes: currentVotes.rightVotes,
				totalVotes: totalVotes,
				leftPercentage: totalVotes > 0
					? Math.round((currentVotes.leftVotes / totalVotes) * 100)
					: 50,
				rightPercentage: totalVotes > 0
					? Math.round((currentVotes.rightVotes / totalVotes) * 100)
					: 50
			},
			updatedBy: 'admin'
		});
		
		res.json({
			success: true,
			data: {
				leftVotes: currentVotes.leftVotes,
				rightVotes: currentVotes.rightVotes,
				totalVotes: totalVotes
			}
		});
	} catch (error) {
		res.status(500).json({ error: '淇敼绁ㄦ暟澶辫触' });
	}
});

app.post('/api/admin/votes/reset', (req, res) => {
	try {
		currentVotes.leftVotes = 0;
		currentVotes.rightVotes = 0;
		
		// 骞挎挱绁ㄦ暟閲嶇疆
		broadcast('vote-updated', {
			votes: {
				leftVotes: 0,
				rightVotes: 0,
				totalVotes: 0,
				leftPercentage: 50,
				rightPercentage: 50
			},
			updatedBy: 'admin',
			action: 'reset'
		});
		
		res.json({
			success: true,
			message: '绁ㄦ暟宸查噸缃?
		});
	} catch (error) {
		res.status(500).json({ error: '閲嶇疆绁ㄦ暟澶辫触' });
	}
});

// ==================== AI 鍐呭绠＄悊 API ====================
app.get('/api/admin/ai-content', (req, res) => {
	try {
		res.json({
			success: true,
			data: aiDebateContent
		});
	} catch (error) {
		res.status(500).json({ error: '鑾峰彇 AI 鍐呭澶辫触' });
	}
});

// ==================== v1 API 璺敱锛堝吋瀹规柊鐗堟湰鍓嶇锛?====================
// 杩欎簺璺敱涓庝笂闈㈢殑璺敱鍔熻兘鐩稿悓锛屼絾浣跨敤 /api/v1 鍓嶇紑锛屾敮鎸佽璇乼oken

// v1: 鑾峰彇AI鍐呭鍒楄〃锛堝繀椤诲湪 /api/admin/ai-content/:id 涔嬪墠瀹氫箟锛岄伩鍏嶈矾鐢卞啿绐侊級
app.get('/api/v1/admin/ai-content/list', (req, res) => {
	console.log('鉁?v1 AI鍐呭鍒楄〃璺敱琚皟鐢?', req.query);
	try {
		const page = parseInt(req.query.page) || 1;
		const pageSize = parseInt(req.query.pageSize) || 20;
		const startTime = req.query.startTime || null;
		const endTime = req.query.endTime || null;
		
		// 楠岃瘉pageSize鏈€澶у€?		if (pageSize > 100) {
			return res.status(400).json({
				success: false,
				message: 'pageSize鏈€澶у€间负100'
			});
		}
		
		// 浠?aiDebateContent 鏁扮粍涓幏鍙栨暟鎹?		let filteredContent = [...aiDebateContent];
		
		// 鎸夋椂闂磋繃婊わ紙濡傛灉鏈夋彁渚涳級
		if (startTime) {
			filteredContent = filteredContent.filter(item => {
				const itemTime = item.timestamp || item.createdAt || 0;
				return new Date(itemTime) >= new Date(startTime);
			});
		}
		if (endTime) {
			filteredContent = filteredContent.filter(item => {
				const itemTime = item.timestamp || item.createdAt || 0;
				return new Date(itemTime) <= new Date(endTime);
			});
		}
		
		// 璁＄畻鎬绘暟
		const total = filteredContent.length;
		
		// 鍒嗛〉
		const start = (page - 1) * pageSize;
		const end = start + pageSize;
		const paginatedContent = filteredContent.slice(start, end);
		
		// 杞崲涓烘枃妗ｆ牸寮?		const items = paginatedContent.map(item => {
			// 璁＄畻璇勮鏁?			const commentCount = (item.comments && Array.isArray(item.comments)) ? item.comments.length : 0;
			
			// 杞崲timestamp涓篒SO鏍煎紡
			let timestampISO = '';
			if (item.timestamp) {
				// 濡傛灉鏄椂闂存埑锛堟暟瀛楋級锛岃浆鎹负ISO鏍煎紡
				if (typeof item.timestamp === 'number') {
					timestampISO = new Date(item.timestamp).toISOString();
				} else {
					timestampISO = new Date(item.timestamp).toISOString();
				}
			} else if (item.createdAt) {
				timestampISO = new Date(item.createdAt).toISOString();
			} else {
				timestampISO = new Date().toISOString();
			}
			
			return {
				id: item.id,
				content: item.content || item.text || '', // 浼樺厛浣跨敤content锛屽鏋滄病鏈夊垯浣跨敤text
				type: 'summary', // 鍥哄畾鍊?				timestamp: timestampISO,
				position: item.position || item.side || 'left', // side杞崲涓簆osition
				confidence: item.confidence || 0.95, // 榛樿缃俊搴?				statistics: {
					views: item.statistics?.views || item.views || 0,
					likes: item.statistics?.likes || item.likes || 0,
					comments: commentCount // 鍙繑鍥炴暟閲忥紝涓嶈繑鍥炶缁嗚瘎璁?				}
			};
		});
		
		res.json({
			success: true,
			data: {
				total: total,
				page: page,
				items: items
			}
		});
		
	} catch (error) {
		console.error('鑾峰彇AI鍐呭鍒楄〃澶辫触:', error);
		res.status(500).json({
			success: false,
			message: '鑾峰彇AI鍐呭鍒楄〃澶辫触: ' + error.message
		});
	}
});

// AI鍐呭鍒楄〃锛堝繀椤诲湪 /api/admin/ai-content/:id 涔嬪墠瀹氫箟锛岄伩鍏嶈矾鐢卞啿绐侊級
app.get('/api/admin/ai-content/list', (req, res) => {
	try {
		const page = parseInt(req.query.page) || 1;
		const pageSize = parseInt(req.query.pageSize) || 20;
		const startTime = req.query.startTime || null;
		const endTime = req.query.endTime || null;
		
		// 浠?aiDebateContent 鏁扮粍涓幏鍙栨暟鎹?		let filteredContent = [...aiDebateContent];
		
		// 鎸夋椂闂磋繃婊わ紙濡傛灉鏈夋彁渚涳級
		if (startTime) {
			filteredContent = filteredContent.filter(item => 
				new Date(item.timestamp || item.createdAt || 0) >= new Date(startTime)
			);
		}
		if (endTime) {
			filteredContent = filteredContent.filter(item => 
				new Date(item.timestamp || item.createdAt || 0) <= new Date(endTime)
			);
		}
		
		// 璁＄畻鎬绘暟
		const total = filteredContent.length;
		
		// 鍒嗛〉
		const start = (page - 1) * pageSize;
		const end = start + pageSize;
		const items = filteredContent.slice(start, end);
		
		res.json({
			success: true,
			data: {
				total: total,
				page: page,
				pageSize: pageSize,
				items: items
			},
			timestamp: Date.now()
		});
		
	} catch (error) {
		console.error('鑾峰彇AI鍐呭鍒楄〃澶辫触:', error);
		res.status(500).json({
			success: false,
			message: '鑾峰彇AI鍐呭鍒楄〃澶辫触: ' + error.message
		});
	}
});

app.get('/api/admin/ai-content/:id', (req, res) => {
	try {
		const { id } = req.params;
		const content = aiDebateContent.find(item => item.id === id);
		
		if (!content) {
			return res.status(404).json({ error: '鍐呭涓嶅瓨鍦? });
		}
		
		res.json({
			success: true,
			data: content
		});
	} catch (error) {
		res.status(500).json({ error: '鑾峰彇 AI 鍐呭澶辫触' });
	}
});

// 鑾峰彇AI鍐呭璇勮鍒楄〃锛堝繀椤诲湪 /api/admin/ai-content/:id/comments/:commentId 涔嬪墠瀹氫箟锛?app.get('/api/admin/ai-content/:id/comments', (req, res) => {
	try {
		const { id } = req.params;
		const page = parseInt(req.query.page) || 1;
		const pageSize = parseInt(req.query.pageSize) || 20;
		
		// 鏌ユ壘AI鍐呭
		const content = aiDebateContent.find(item => item.id === id);
		
		if (!content) {
			return res.status(404).json({
				success: false,
				message: 'AI鍐呭涓嶅瓨鍦?
			});
		}
		
		// 鑾峰彇璇勮鍒楄〃锛堜粠 content.comments 鎴?content.items.comments锛?		let comments = [];
		if (content.comments && Array.isArray(content.comments)) {
			comments = content.comments;
		} else if (content.items && Array.isArray(content.items)) {
			// 濡傛灉璇勮鍦?items 鏁扮粍涓?			const contentItem = content.items.find(item => item.id === id);
			if (contentItem && contentItem.comments) {
				comments = contentItem.comments;
			}
		}
		
		// 鍒嗛〉
		const total = comments.length;
		const start = (page - 1) * pageSize;
		const end = start + pageSize;
		const paginatedComments = comments.slice(start, end);
		
		res.json({
			success: true,
			data: {
				contentId: id,
				contentText: content.content || content.text || '',
				total: total,
				page: page,
				pageSize: pageSize,
				comments: paginatedComments
			},
			timestamp: Date.now()
		});
		
	} catch (error) {
		console.error('鑾峰彇AI鍐呭璇勮鍒楄〃澶辫触:', error);
		res.status(500).json({
			success: false,
			message: '鑾峰彇璇勮鍒楄〃澶辫触: ' + error.message
		});
	}
});

// 鍒犻櫎AI鍐呭璇勮
app.delete('/api/admin/ai-content/:id/comments/:commentId', (req, res) => {
	try {
		const { id, commentId } = req.params;
		const { reason = '', notifyUsers = true } = req.body;
		
		// 鏌ユ壘AI鍐呭
		const content = aiDebateContent.find(item => item.id === id);
		
		if (!content) {
			return res.status(404).json({
				success: false,
				message: 'AI鍐呭涓嶅瓨鍦?
			});
		}
		
		// 鑾峰彇璇勮鍒楄〃
		let comments = [];
		if (content.comments && Array.isArray(content.comments)) {
			comments = content.comments;
		}
		
		// 鏌ユ壘璇勮
		const commentIndex = comments.findIndex(c => (c.commentId || c.id) === commentId);
		
		if (commentIndex === -1) {
			return res.status(404).json({
				success: false,
				message: '璇勮涓嶅瓨鍦?
			});
		}
		
		// 鍒犻櫎璇勮
		const deletedComment = comments.splice(commentIndex, 1)[0];
		
		// 鏇存柊鍐呭涓殑璇勮鏁扮粍
		content.comments = comments;
		
		// 鏇存柊缁熻鏁版嵁
		if (content.statistics) {
			content.statistics.comments = (content.statistics.comments || 0) - 1;
		}
		
		// 濡傛灉閫氱煡鐢ㄦ埛锛屽彲浠ュ湪杩欓噷鍙戦€乄ebSocket娑堟伅
		if (notifyUsers) {
			// broadcast('comment-deleted', { contentId: id, commentId: commentId });
		}
		
		console.log(`馃棏锔? 宸插垹闄よ瘎璁? ${commentId}, 鍘熷洜: ${reason || '绠＄悊鍛樺垹闄?}`);
		
		res.json({
			success: true,
			data: {
				contentId: id,
				commentId: commentId,
				deleted: true
			},
			message: '璇勮宸插垹闄?,
			timestamp: Date.now()
		});
		
	} catch (error) {
		console.error('鍒犻櫎璇勮澶辫触:', error);
		res.status(500).json({
			success: false,
			message: '鍒犻櫎璇勮澶辫触: ' + error.message
		});
	}
});

// v1: 鑾峰彇AI鍐呭璇勮鍒楄〃
app.get('/api/v1/admin/ai-content/:id/comments', (req, res) => {
	try {
		const { id } = req.params;
		const page = parseInt(req.query.page) || 1;
		const pageSize = parseInt(req.query.pageSize) || 20;
		
		// 楠岃瘉pageSize鏈€澶у€?		if (pageSize > 100) {
			return res.status(400).json({
				success: false,
				message: 'pageSize鏈€澶у€间负100'
			});
		}
		
		// 鏌ユ壘AI鍐呭
		const content = aiDebateContent.find(item => item.id === id);
		
		if (!content) {
			return res.status(404).json({
				success: false,
				message: 'AI鍐呭涓嶅瓨鍦?
			});
		}
		
		// 鑾峰彇璇勮鍒楄〃锛堜粠 content.comments锛?		let comments = [];
		if (content.comments && Array.isArray(content.comments)) {
			comments = content.comments;
		}
		
		// 鎸夋椂闂村€掑簭鎺掑簭锛堟渶鏂扮殑鍦ㄥ墠锛?		comments.sort((a, b) => {
			const timeA = a.timestamp || a.time || 0;
			const timeB = b.timestamp || b.time || 0;
			// 濡傛灉鏄椂闂存埑锛岀洿鎺ユ瘮杈冿紱濡傛灉鏄疘SO瀛楃涓诧紝杞崲涓烘椂闂存埑姣旇緝
			const tsA = typeof timeA === 'number' ? timeA : new Date(timeA).getTime();
			const tsB = typeof timeB === 'number' ? timeB : new Date(timeB).getTime();
			return tsB - tsA; // 闄嶅簭
		});
		
		// 鍒嗛〉
		const total = comments.length;
		const start = (page - 1) * pageSize;
		const end = start + pageSize;
		const paginatedComments = comments.slice(start, end);
		
		// 杞崲涓烘枃妗ｆ牸寮?		const formattedComments = paginatedComments.map(comment => {
			// 杞崲timestamp涓篒SO鏍煎紡
			let timestampISO = '';
			if (comment.timestamp) {
				if (typeof comment.timestamp === 'number') {
					timestampISO = new Date(comment.timestamp).toISOString();
				} else {
					timestampISO = new Date(comment.timestamp).toISOString();
				}
			} else if (comment.time) {
				// 濡傛灉鍙湁time瀛楁锛堝"鍒氬垰"銆?3鍒嗛挓鍓?锛夛紝浣跨敤褰撳墠鏃堕棿
				timestampISO = new Date().toISOString();
			} else {
				timestampISO = new Date().toISOString();
			}
			
			// 鍒ゆ柇鏄惁涓哄尶鍚嶇敤鎴?			const userId = comment.userId || 
				(comment.user === '鍖垮悕鐢ㄦ埛' || !comment.user ? 'anonymous' : null) || 
				'anonymous';
			
			return {
				commentId: comment.commentId || comment.id || '',
				userId: userId,
				nickname: comment.nickname || comment.user || '鍖垮悕鐢ㄦ埛',
				avatar: comment.avatar || '馃懁',
				content: comment.content || comment.text || '',
				likes: comment.likes || 0,
				timestamp: timestampISO
			};
		});
		
		res.json({
			success: true,
			data: {
				contentId: id,
				contentText: content.content || content.text || '',
				total: total,
				page: page,
				pageSize: pageSize,
				comments: formattedComments
			}
		});
		
	} catch (error) {
		console.error('鑾峰彇AI鍐呭璇勮鍒楄〃澶辫触:', error);
		res.status(500).json({
			success: false,
			message: '鑾峰彇璇勮鍒楄〃澶辫触: ' + error.message
		});
	}
});

// v1: 鍒犻櫎AI鍐呭璇勮
app.delete('/api/v1/admin/ai-content/:id/comments/:commentId', (req, res) => {
	try {
		const { id, commentId } = req.params;
		const { reason = '', notifyUsers = true } = req.body;
		
		// 鏌ユ壘AI鍐呭
		const content = aiDebateContent.find(item => item.id === id);
		
		if (!content) {
			return res.status(404).json({
				success: false,
				message: 'AI鍐呭涓嶅瓨鍦?
			});
		}
		
		// 鑾峰彇璇勮鍒楄〃
		let comments = [];
		if (content.comments && Array.isArray(content.comments)) {
			comments = content.comments;
		}
		
		// 鏌ユ壘璇勮锛堟敮鎸乧ommentId鎴杋d瀛楁锛?		const commentIndex = comments.findIndex(c => {
			const cId = c.commentId || c.id;
			return cId === commentId || String(cId) === String(commentId);
		});
		
		if (commentIndex === -1) {
			return res.status(404).json({
				success: false,
				message: `璇勮ID ${commentId} 涓嶅瓨鍦ㄦ垨涓嶅睘浜庡唴瀹笽D ${id}`
			});
		}
		
		// 鍒犻櫎璇勮
		const deletedComment = comments.splice(commentIndex, 1)[0];
		
		// 鏇存柊鍐呭涓殑璇勮鏁扮粍
		content.comments = comments;
		
		// 鏇存柊缁熻鏁版嵁
		if (content.statistics) {
			content.statistics.comments = (content.statistics.comments || 0) - 1;
		} else {
			content.statistics = {
				views: content.statistics?.views || 0,
				likes: content.statistics?.likes || content.likes || 0,
				comments: comments.length
			};
		}
		
		// 濡傛灉閫氱煡鐢ㄦ埛锛岄€氳繃WebSocket骞挎挱鍒犻櫎閫氱煡
		if (notifyUsers) {
			broadcast('comment-deleted', {
				contentId: id,
				commentId: commentId,
				timestamp: Date.now()
			});
		}
		
		console.log(`馃棏锔? 宸插垹闄よ瘎璁? ${commentId}, 鍘熷洜: ${reason || '绠＄悊鍛樺垹闄?}`);
		
		// 鎸夌収鏂囨。鏍煎紡杩斿洖鍝嶅簲
		res.json({
			success: true,
			data: {
				commentId: commentId,
				contentId: id,
				deleteTime: null // 鐢卞墠绔～鍏呭綋鍓嶆椂闂?			},
			message: '璇勮宸插垹闄?
		});
		
	} catch (error) {
		console.error('鍒犻櫎璇勮澶辫触:', error);
		res.status(500).json({
			success: false,
			message: '鍒犻櫎璇勮澶辫触: ' + error.message
		});
	}
});

app.post('/api/admin/ai-content', (req, res) => {
	try {
		const { text, side, debate_id } = req.body;
		
		if (!text || !side) {
			return res.status(400).json({ error: '缂哄皯蹇呰鍙傛暟: text, side' });
		}
		
		if (side !== 'left' && side !== 'right') {
			return res.status(400).json({ error: 'side 蹇呴』鏄?"left" 鎴?"right"' });
		}
		
		const newContent = {
			id: uuidv4(),
			debate_id: debate_id || debateTopic.id,
			text: text.trim(),
			side: side,
			timestamp: new Date().getTime(),
			comments: [],
			likes: 0
		};
		
		aiDebateContent.push(newContent);
		
		// 骞挎挱鏂板唴瀹规坊鍔?		broadcast('newAIContent', {
			...newContent,
			updatedBy: 'admin'
		});
		
		res.json({
			success: true,
			data: newContent
		});
	} catch (error) {
		res.status(500).json({ error: '娣诲姞 AI 鍐呭澶辫触' });
	}
});

app.put('/api/admin/ai-content/:id', (req, res) => {
	try {
		const { id } = req.params;
		const { text, side, debate_id } = req.body;
		
		const index = aiDebateContent.findIndex(item => item.id === id);
		if (index === -1) {
			return res.status(404).json({ error: '鍐呭涓嶅瓨鍦? });
		}
		
		if (text !== undefined) {
			aiDebateContent[index].text = text.trim();
		}
		if (side !== undefined) {
			if (side !== 'left' && side !== 'right') {
				return res.status(400).json({ error: 'side 蹇呴』鏄?"left" 鎴?"right"' });
			}
			aiDebateContent[index].side = side;
		}
		if (debate_id !== undefined) {
			aiDebateContent[index].debate_id = debate_id;
		}
		
		// 骞挎挱鍐呭鏇存柊
		broadcast('ai-content-updated', {
			content: aiDebateContent[index],
			updatedBy: 'admin'
		});
		
		res.json({
			success: true,
			data: aiDebateContent[index]
		});
	} catch (error) {
		res.status(500).json({ error: '鏇存柊 AI 鍐呭澶辫触' });
	}
});

app.delete('/api/admin/ai-content/:id', (req, res) => {
	try {
		const { id } = req.params;
		const index = aiDebateContent.findIndex(item => item.id === id);
		
		if (index === -1) {
			return res.status(404).json({ error: '鍐呭涓嶅瓨鍦? });
		}
		
		const deletedContent = aiDebateContent.splice(index, 1)[0];
		
		// 骞挎挱鍐呭鍒犻櫎
		broadcast('aiContentDeleted', {
			contentId: id,
			updatedBy: 'admin'
		});
		
		res.json({
			success: true,
			message: '鍒犻櫎鎴愬姛',
			data: deletedContent
		});
	} catch (error) {
		res.status(500).json({ error: '鍒犻櫎 AI 鍐呭澶辫触' });
	}
});

// ==================== 鍚庡彴绠＄悊 API 缁撴潫 ====================

// ==================== 缁熻 API锛堝彧璇伙級 ====================
app.get('/api/admin/statistics/summary', (req, res) => {
    try {
        const db = require('../admin/db.js');
        const stats = db.statistics.get();
        const users = db.users.getAll();
        const streams = db.streams.getAll();
        const totalVotes = stats.totalVotes || 0;
        const totalUsers = users.length;
        const totalStreams = streams.length;
        const totalLiveDays = Array.isArray(stats.dailyStats) ? stats.dailyStats.length : 0;
        res.json({
            success: true,
            data: {
                totalVotes,
                totalUsers,
                totalStreams,
                totalLiveDays
            }
        });
    } catch (error) {
        res.status(500).json({ error: '鑾峰彇缁熻姹囨€诲け璐? });
    }
});

app.get('/api/admin/statistics/daily', (req, res) => {
    try {
        const db = require('../admin/db.js');
        const stats = db.statistics.get();
        const daily = Array.isArray(stats.dailyStats) ? stats.dailyStats : [];
        res.json({ success: true, data: daily });
    } catch (error) {
        res.status(500).json({ error: '鑾峰彇姣忔棩缁熻澶辫触' });
    }
});

// 娣诲姞璇锋眰鏃ュ織涓棿浠讹紙璋冭瘯鐢級
app.use((req, res, next) => {
	if (req.path.startsWith('/api')) {
		console.log(`馃摜 API璇锋眰: ${req.method} ${req.path}`);
	}
	next();
});

// 闈欐€佹枃浠舵湇鍔★紙鎻愪緵闈欐€佽祫婧愶紝濡傞渶瑕侊級
// 娉ㄦ剰锛歶ni-app 灏忕▼搴忛」鐩€氬父涓嶉渶瑕佸湪鏈嶅姟鍣ㄦ彁渚涘墠绔潤鎬佹枃浠?// 濡傛灉闇€瑕佹彁渚涙瀯寤哄悗鐨勯潤鎬佹枃浠讹紝鍙互鍙栨秷娉ㄩ噴骞堕厤缃纭矾寰?// app.use(express.static(path.join(__dirname, 'dist')));

// 404澶勭悊鍣紙API 璺敱锛?app.use((req, res) => {
	// 濡傛灉鏄?API 璇锋眰锛岃繑鍥?JSON 鏍煎紡閿欒
	if (req.path.startsWith('/api')) {
		console.log(`鈿狅笍  API璺敱鏈壘鍒? ${req.method} ${req.path}`);
		res.status(404).json({
			success: false,
			error: 'Not Found',
			path: req.path,
			message: `API璺敱 ${req.path} 鏈畾涔塦
		});
	} else {
		// 鍏朵粬璇锋眰杩斿洖 404
		console.log(`鈿狅笍  璺敱鏈壘鍒? ${req.method} ${req.url}`);
		res.status(404).json({
			error: 'Not Found',
			path: req.url,
			message: `璺敱 ${req.url} 鏈畾涔塦
		});
	}
});


// 妯℃嫙鏁版嵁
let currentVotes = {
    leftVotes: 0,   // 姝ｆ柟绁ㄦ暟
    rightVotes: 0   // 鍙嶆柟绁ㄦ暟
};

// 杈╅淇℃伅
const debateTopic = {
    id: 'debate-default-001', // 杈╅ID锛岀敤浜庢爣璇嗚杈╅
    title: "濡傛灉鏈変竴涓兘涓€閿秷闄ょ棝鑻︾殑鎸夐挳锛屼綘浼氭寜鍚楋紵",
    description: "杩欐槸涓€涓叧浜庣棝鑻︺€佹垚闀夸笌浜烘€ч€夋嫨鐨勬繁搴﹁京璁?
};

// AI鏅鸿兘璇嗗埆鐨勮京璁哄唴瀹?const aiDebateContent = [
    {
        id: uuidv4(),
        debate_id: debateTopic.id, // 鏍囪瘑璇ヨ鐐瑰睘浜庡摢涓京棰?        text: "姝ｆ柟瑙傜偣锛氱棝鑻︽槸浜虹敓鎴愰暱鐨勫繀瑕佺粡鍘嗭紝娑堥櫎鐥涜嫤浼氳鎴戜滑澶卞幓瀛︿範鍜屾垚闀跨殑鏈轰細銆?,
        side: "left",
        timestamp: new Date().getTime() - 300000, // 5鍒嗛挓鍓?        comments: [
            {
                id: uuidv4(),
                user: "蹇冪悊瀛﹀",
                text: "鐥涜嫤纭疄鑳戒績杩涘績鐞嗘垚闀匡紝浣嗚繃搴︾殑鐥涜嫤涔熷彲鑳介€犳垚鍒涗激",
                time: "3鍒嗛挓鍓?,
                avatar: "馃",
                likes: 15
            },
            {
                id: uuidv4(),
                user: "鍝插瀹?,
                text: "灏奸噰璇磋繃锛岄偅浜涙潃涓嶆鎴戜滑鐨勶紝浼氳鎴戜滑鏇村己澶?,
                time: "4鍒嗛挓鍓?,
                avatar: "馃",
                likes: 23
            }
        ],
        likes: 45
    },
    {
        id: uuidv4(),
        debate_id: debateTopic.id, // 鏍囪瘑璇ヨ鐐瑰睘浜庡摢涓京棰?        text: "鍙嶆柟瑙傜偣锛氬鏋滆兘澶熸秷闄ょ棝鑻︼紝涓轰粈涔堜笉鍛紵鐥涜嫤鏈韩娌℃湁浠峰€硷紝娑堥櫎鐥涜嫤鍙互璁╀汉鏇翠笓娉ㄤ簬绉瀬鐨勪簨鎯呫€?,
        side: "right",
        timestamp: new Date().getTime() - 240000, // 4鍒嗛挓鍓?        comments: [
            {
                id: uuidv4(),
                user: "鍖荤敓",
                text: "浣滀负鍖荤敓锛屾垜瑙佽繃澶涓嶅繀瑕佺殑鐥涜嫤锛屽鏋滆兘娑堥櫎锛屾垜鏀寔",
                time: "2鍒嗛挓鍓?,
                avatar: "馃懆鈥嶁殨锔?,
                likes: 18
            },
            {
                id: uuidv4(),
                user: "鎮ｈ€呭灞?,
                text: "鐪嬬潃浜蹭汉鐥涜嫤锛屾垜澶氫箞甯屾湜鏈夎繖鏍风殑鎸夐挳",
                time: "3鍒嗛挓鍓?,
                avatar: "馃挐",
                likes: 31
            }
        ],
        likes: 52
    },
    {
        id: uuidv4(),
        debate_id: debateTopic.id, // 鏍囪瘑璇ヨ鐐瑰睘浜庡摢涓京棰?        text: "姝ｆ柟鍥炲簲锛氱棝鑻﹁鎴戜滑瀛︿細鍚岀悊蹇冿紝濡傛灉鎵€鏈変汉閮芥病鏈夌棝鑻︾粡鍘嗭紝鎴戜滑濡備綍鐞嗚В浠栦汉鐨勮嫤闅撅紵",
        side: "left",
        timestamp: new Date().getTime() - 180000, // 3鍒嗛挓鍓?        comments: [
            {
                id: uuidv4(),
                user: "绀惧伐",
                text: "鍚岀悊蹇冪‘瀹為渶瑕佺棝鑻︾殑缁忓巻鏉ュ煿鍏?,
                time: "1鍒嗛挓鍓?,
                avatar: "馃",
                likes: 12
            },
            {
                id: uuidv4(),
                user: "浣滃",
                text: "寰堝浼熷ぇ鐨勬枃瀛︿綔鍝侀兘婧愪簬浣滆€呯殑鐥涜嫤缁忓巻",
                time: "2鍒嗛挓鍓?,
                avatar: "馃摎",
                likes: 19
            }
        ],
        likes: 38
    },
    {
        id: uuidv4(),
        debate_id: debateTopic.id, // 鏍囪瘑璇ヨ鐐瑰睘浜庡摢涓京棰?        text: "鍙嶆柟鍥炲簲锛氭垜浠彲浠ラ€氳繃鍏朵粬鏂瑰紡鍩瑰吇鍚岀悊蹇冿紝姣斿闃呰銆佹暀鑲层€傛秷闄ょ棝鑻︿笉绛変簬娑堥櫎鎵€鏈夎礋闈㈡儏缁€?,
        side: "right",
        timestamp: new Date().getTime() - 120000, // 2鍒嗛挓鍓?        comments: [
            {
                id: uuidv4(),
                user: "鏁欒偛宸ヤ綔鑰?,
                text: "鏁欒偛纭疄鍙互鍩瑰吇鍚岀悊蹇冿紝涓嶄竴瀹氶渶瑕佷翰韬粡鍘嗙棝鑻?,
                time: "1鍒嗛挓鍓?,
                avatar: "馃懇鈥嶐煆?,
                likes: 16
            },
            {
                id: uuidv4(),
                user: "蹇冪悊鍜ㄨ甯?,
                text: "鍖哄垎鐥涜嫤鍜岃礋闈㈡儏缁緢閲嶈锛岃繖涓寜閽彲鑳藉彧閽堝鐪熸鐨勭棝鑻?,
                time: "鍒氬垰",
                avatar: "馃挱",
                likes: 8
            }
        ],
        likes: 41
    },
    {
        id: uuidv4(),
        debate_id: debateTopic.id, // 鏍囪瘑璇ヨ鐐瑰睘浜庡摢涓京棰?        text: "姝ｆ柟鎬荤粨锛氱棝鑻︽槸浜烘€х殑涓€閮ㄥ垎锛屾秷闄ょ棝鑻﹀彲鑳戒細璁╂垜浠け鍘讳綔涓轰汉鐨勫畬鏁存€с€?,
        side: "left",
        timestamp: new Date().getTime() - 60000, // 1鍒嗛挓鍓?        comments: [
            {
                id: uuidv4(),
                user: "绁炲瀹?,
                text: "鐥涜嫤鍦ㄥ畻鏁欏拰鍝插涓兘鏈夊叾娣卞眰鎰忎箟",
                time: "鍒氬垰",
                avatar: "鉀?,
                likes: 14
            }
        ],
        likes: 29
    }
];

// 妯℃嫙瀹炴椂绁ㄦ暟鍙樺寲
function simulateVoteChanges() {
    setInterval(() => {
        if (!globalLiveStatus.isLive) return; // 鍙湁鐩存挱鏃舵墠妯℃嫙
        // 闅忔満澧炲姞绁ㄦ暟锛屾ā鎷熻浼楁姇绁?        const leftIncrease = Math.floor(Math.random() * 5) + 1;
        const rightIncrease = Math.floor(Math.random() * 5) + 1;
        
        currentVotes.leftVotes += leftIncrease;
        currentVotes.rightVotes += rightIncrease;
        
        console.log(`绁ㄦ暟鏇存柊: 姝ｆ柟 ${currentVotes.leftVotes}, 鍙嶆柟 ${currentVotes.rightVotes}`);
    }, 3000); // 姣?绉掓洿鏂颁竴娆?}

// 妯℃嫙AI璇嗗埆鏂板唴瀹?function simulateNewAIContent() {
    const newContents = [
        {
            text: "姝ｆ柟琛ュ厖锛氱棝鑻﹁鎴戜滑鐝嶆儨蹇箰锛屾病鏈夊姣斿氨娌℃湁鐪熸鐨勫垢绂忋€?,
            side: "left"
        },
        {
            text: "鍙嶆柟琛ュ厖锛氱幇浠ｅ尰瀛﹀凡缁忓湪娑堥櫎寰堝鐥涜嫤锛岃繖涓寜閽彧鏄妧鏈殑寤朵几銆?,
            side: "right"
        },
        {
            text: "姝ｆ柟璐ㄧ枒锛氬鏋滄墍鏈変汉閮芥寜杩欎釜鎸夐挳锛岀ぞ浼氫細鍙樻垚浠€涔堟牱锛?,
            side: "left"
        },
        {
            text: "鍙嶆柟鍥炲簲锛氭瘡涓汉閮芥湁鑷繁鐨勯€夋嫨鏉冿紝涓嶅簲璇ュ己杩埆浜烘壙鍙楃棝鑻︺€?,
            side: "right"
        }
    ];
    
    setInterval(() => {
        if (!globalLiveStatus.isLive) return; // 鍙湁鐩存挱鏃舵墠妯℃嫙AI鍐呭
        const randomContent = newContents[Math.floor(Math.random() * newContents.length)];
        const newContent = {
            id: uuidv4(), // 浣跨敤UUID
            debate_id: debateTopic.id, // 鏍囪瘑璇ヨ鐐瑰睘浜庡摢涓京棰?            text: randomContent.text,
            side: randomContent.side,
            timestamp: new Date().getTime(),
            comments: [],
            likes: Math.floor(Math.random() * 20) + 10
        };
        
        aiDebateContent.push(newContent);
        console.log(`鏂板AI鍐呭: ${newContent.text}`);
    }, 15000); // 姣?5绉掓坊鍔犳柊鍐呭
}

// API璺敱

// 鑾峰彇褰撳墠绁ㄦ暟
app.get('/api/votes', (req, res) => {
    try {
        const totalVotes = currentVotes.leftVotes + currentVotes.rightVotes;
        res.json({
            success: true,
            data: {
                leftVotes: currentVotes.leftVotes,
                rightVotes: currentVotes.rightVotes,
                totalVotes: totalVotes,
                leftPercentage: totalVotes > 0
                    ? Math.round((currentVotes.leftVotes / totalVotes) * 100)
                    : 50,
                rightPercentage: totalVotes > 0
                    ? Math.round((currentVotes.rightVotes / totalVotes) * 100)
                    : 50
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "鑾峰彇绁ㄦ暟鏃跺嚭閿? " + error.message
        });
    }
});

// 鑾峰彇杈╅淇℃伅
app.get('/api/debate-topic', (req, res) => {
    try {
        // 纭繚杩斿洖鐨勮京棰樹俊鎭寘鍚?id 瀛楁
        res.json({
            success: true,
            data: {
                id: debateTopic.id,
                title: debateTopic.title,
                description: debateTopic.description
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "鑾峰彇杈╅鏃跺嚭閿? " + error.message
        });
    }
});

// 鑾峰彇AI璇嗗埆鍐呭
app.get('/api/ai-content', (req, res) => {
    try {
        res.json({
            success: true,
            data: aiDebateContent
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "鑾峰彇AI鍐呭鏃跺嚭閿? " + error.message
        });
    }
});

// 娣诲姞璇勮锛堣浆鍙戝埌Java鍚庣锛?app.post('/api/comment', (req, res) => {
    const { contentId, user, text, avatar } = req.body;

    // 鍙傛暟楠岃瘉
    if (!contentId || !text) {
        return res.status(400).json({
            success: false,
            message: "缂哄皯蹇呰鍙傛暟: contentId 鍜?text"
        });
    }

    if (typeof text !== 'string' || text.trim().length === 0) {
        return res.status(400).json({
            success: false,
            message: "璇勮鍐呭涓嶈兘涓虹┖"
        });
    }

    console.log('馃摛 杞彂璇勮璇锋眰鍒癑ava鍚庣:', { contentId, user, text: text.substring(0, 50) });
    
    // 杞彂鍒癑ava鍚庣锛堢鍙?081锛?    const options = {
        hostname: 'localhost',
        port: 8081,
        path: '/api/comment',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        },
        timeout: 5000 // 5绉掕秴鏃?    };
    
    const proxyReq = http.request(options, (proxyRes) => {
        let data = '';
        proxyRes.on('data', (chunk) => {
            data += chunk;
        });
        proxyRes.on('end', () => {
            console.log('馃摜 Java鍚庣璇勮鍝嶅簲:', proxyRes.statusCode, data.substring(0, 200));
            // 灏咼ava鍚庣鐨勫搷搴斿師鏍疯繑鍥炵粰瀹㈡埛绔?            res.status(proxyRes.statusCode);
            res.setHeader('Content-Type', 'application/json');
            res.end(data);
        });
    });
    
    proxyReq.on('error', (error) => {
        console.error('鉂?杞彂璇勮璇锋眰澶辫触:', error.message);
        res.status(500).json({
            success: false,
            message: '璇勮鏈嶅姟鏆傛椂涓嶅彲鐢? ' + error.message
        });
    });
    
    proxyReq.on('timeout', () => {
        console.error('鈴?杞彂璇勮璇锋眰瓒呮椂');
        proxyReq.destroy();
        res.status(504).json({
            success: false,
            message: '璇勮鏈嶅姟鍝嶅簲瓒呮椂'
        });
    });
    
    // 鍙戦€佽姹備綋
    proxyReq.write(JSON.stringify({ contentId, user, text, avatar }));
    proxyReq.end();
});

// 鍒犻櫎璇勮
app.delete('/api/comment/:commentId', (req, res) => {
    const { commentId } = req.params;
    const { contentId } = req.body;

    // 鍙傛暟楠岃瘉
    if (!commentId || !contentId) {
        return res.status(400).json({
            success: false,
            message: "缂哄皯蹇呰鍙傛暟: commentId 鍜?contentId"
        });
    }

    const content = aiDebateContent.find(item => item.id === String(contentId));
    if (!content) {
        return res.status(404).json({
            success: false,
            message: "鍐呭涓嶅瓨鍦?
        });
    }

    const commentIndex = content.comments.findIndex(c => c.id === String(commentId));
    if (commentIndex === -1) {
        return res.status(404).json({
            success: false,
            message: "璇勮涓嶅瓨鍦?
        });
    }

    // 鍒犻櫎璇勮
    const deletedComment = content.comments.splice(commentIndex, 1)[0];

    res.json({
        success: true,
        data: {
            message: "璇勮鍒犻櫎鎴愬姛",
            deletedComment: deletedComment
        }
    });
});

// 鐐硅禐锛堣浆鍙戝埌Java鍚庣锛?app.post('/api/like', (req, res) => {
    console.log('鉁?/api/like 璺敱琚皟鐢?);
    console.log('馃摜 璇锋眰鍙傛暟:', { contentId: req.body.contentId, commentId: req.body.commentId });
    const { contentId, commentId } = req.body;

    // 鍙傛暟楠岃瘉
    if (!contentId) {
        return res.status(400).json({
            success: false,
            message: "缂哄皯蹇呰鍙傛暟: contentId"
        });
    }

    console.log('馃摛 杞彂鐐硅禐璇锋眰鍒癑ava鍚庣:', { contentId, commentId });
    
    // 鏋勫缓鏌ヨ瀛楃涓?    let queryParams = `contentId=${encodeURIComponent(contentId)}`;
    if (commentId !== undefined && commentId !== null && commentId !== '') {
        queryParams += `&commentId=${encodeURIComponent(commentId)}`;
    }
    
    // 杞彂鍒癑ava鍚庣锛堢鍙?081锛?    const options = {
        hostname: 'localhost',
        port: 8081,
        path: `/api/like?${queryParams}`,
        method: 'POST',
        headers: {
            'Accept': 'application/json'
        },
        timeout: 5000 // 5绉掕秴鏃?    };
    
    const proxyReq = http.request(options, (proxyRes) => {
        let data = '';
        proxyRes.on('data', (chunk) => {
            data += chunk;
        });
        proxyRes.on('end', () => {
            console.log('馃摜 Java鍚庣鐐硅禐鍝嶅簲:', proxyRes.statusCode, data.substring(0, 200));
            // 灏咼ava鍚庣鐨勫搷搴斿師鏍疯繑鍥炵粰瀹㈡埛绔?            res.status(proxyRes.statusCode);
            res.setHeader('Content-Type', 'application/json');
            res.end(data);
        });
    });
    
    proxyReq.on('error', (error) => {
        console.error('鉂?杞彂鐐硅禐璇锋眰澶辫触:', error.message);
        res.status(500).json({
            success: false,
            message: '鐐硅禐鏈嶅姟鏆傛椂涓嶅彲鐢? ' + error.message
        });
    });
    
    proxyReq.on('timeout', () => {
        console.error('鈴?杞彂鐐硅禐璇锋眰瓒呮椂');
        proxyReq.destroy();
        res.status(504).json({
            success: false,
            message: '鐐硅禐鏈嶅姟鍝嶅簲瓒呮椂'
        });
    });
    
    // POST璇锋眰闇€瑕佺粨鏉熻姹備綋锛屼絾鏌ヨ鍙傛暟宸插湪璺緞涓紶閫?    proxyReq.end();
});

// ==================== 寰俊鐧诲綍杈呭姪鍑芥暟 ====================

/**
 * 璋冪敤寰俊API鑾峰彇openid鍜宻ession_key
 * @param {string} appid - 寰俊灏忕▼搴廇ppID
 * @param {string} secret - 寰俊灏忕▼搴廇ppSecret
 * @param {string} code - 寰俊鐧诲綍code
 * @returns {Promise<Object>} 寰俊API鍝嶅簲鏁版嵁
 */
function callWechatAPI(appid, secret, code) {
    return new Promise((resolve, reject) => {
        const url = `https://api.weixin.qq.com/sns/jscode2session?appid=${appid}&secret=${secret}&js_code=${code}&grant_type=authorization_code`;
        
        https.get(url, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                try {
                    const result = JSON.parse(data);
                    resolve(result);
                } catch (error) {
                    reject(new Error('瑙ｆ瀽寰俊API鍝嶅簲澶辫触: ' + error.message));
                }
            });
        }).on('error', (error) => {
            reject(new Error('璋冪敤寰俊API澶辫触: ' + error.message));
        });
    });
}

// 寰俊閰嶇疆锛堜粠缁熶竴閰嶇疆鏂囦欢鑾峰彇锛?const WECHAT_CONFIG = {
    appid: currentConfig.wechat.appid,
    secret: process.env.WECHAT_SECRET || currentConfig.wechat.secret,
    useMock: currentConfig.wechat.useMock
};

// 寰俊鐧诲綍鎺ュ彛
app.post('/api/wechat-login', async (req, res) => {
    const { code, userInfo, encryptedData, iv } = req.body;

    // 鍙傛暟楠岃瘉
    if (!code) {
        return res.status(400).json({
            success: false,
            message: "缂哄皯蹇呰鍙傛暟: code"
        });
    }

    try {
        console.log('鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺?);
        console.log('寰俊鐧诲綍璇锋眰鏀跺埌');
        console.log('鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺?);
        console.log('Code:', code);
        console.log('UserInfo:', userInfo?.nickName);
        console.log('useMock 閰嶇疆:', WECHAT_CONFIG.useMock);
        console.log('鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺?);
        
        let wechatData = null;
        
        // 鏍规嵁閰嶇疆鍐冲畾浣跨敤妯℃嫙妯″紡杩樻槸鐪熷疄寰俊API
        if (WECHAT_CONFIG.useMock) {
            // 浣跨敤妯℃嫙妯″紡锛堢敤浜庡紑鍙戞祴璇曟垨 H5 鐜锛?            console.log('鉁?浣跨敤妯℃嫙寰俊鐧诲綍鍝嶅簲锛堝紑鍙戞ā寮忥級');
            
            // 妯℃嫙寰俊API鍝嶅簲
            wechatData = {
                openid: 'mock_openid_' + Date.now(),
                session_key: 'mock_session_key_' + Math.random().toString(36).substr(2, 9),
                // 娉ㄦ剰锛氱湡瀹濧PI涓嶄細杩斿洖unionid锛岄櫎闈炵敤鎴峰凡缁戝畾寮€鏀惧钩鍙?            };
            
            console.log('妯℃嫙鏁版嵁鐢熸垚鎴愬姛:', {
                openid: wechatData.openid,
                session_key: wechatData.session_key.substring(0, 10) + '...'
            });
        } else {
            // 浣跨敤鐪熷疄寰俊API
            console.log('馃寪 璋冪敤鐪熷疄寰俊鐧诲綍API');
            console.log('AppID:', WECHAT_CONFIG.appid);
            
            try {
                console.log('馃搵 寰俊鐧诲綍閰嶇疆淇℃伅:');
                console.log('  - AppID:', WECHAT_CONFIG.appid);
                console.log('  - Secret:', WECHAT_CONFIG.secret ? WECHAT_CONFIG.secret.substring(0, 8) + '...' : '鏈缃?);
                console.log('  - Code:', code ? code.substring(0, 20) + '...' : '鏈彁渚?);
                
                const apiResult = await callWechatAPI(WECHAT_CONFIG.appid, WECHAT_CONFIG.secret, code);
                
                // 妫€鏌ュ井淇PI杩斿洖鐨勯敊璇?                if (apiResult.errcode) {
                    console.error('鉂?寰俊API杩斿洖閿欒:');
                    console.error('  - 閿欒鐮?', apiResult.errcode);
                    console.error('  - 閿欒淇℃伅:', apiResult.errmsg);
                    console.error('  - 瀹屾暣鍝嶅簲:', JSON.stringify(apiResult, null, 2));
                    
                    // 鐗规畩澶勭悊甯歌閿欒
                    let errorMessage = `寰俊API閿欒: ${apiResult.errmsg || '鏈煡閿欒'}, rid: ${apiResult.errcode || 'N/A'}`;
                    if (apiResult.errcode === 40029) {
                        errorMessage = '寰俊API閿欒: invalid code (code鏃犳晥鎴栧凡杩囨湡), rid: ' + apiResult.errcode;
                    } else if (apiResult.errcode === 40163) {
                        errorMessage = '寰俊API閿欒: code been used (code宸茶浣跨敤), rid: ' + apiResult.errcode;
                    }
                    
                    return res.status(400).json({
                        success: false,
                        message: errorMessage
                    });
                }
                
                // 鎴愬姛鑾峰彇寰俊鏁版嵁
                wechatData = {
                    openid: apiResult.openid,
                    session_key: apiResult.session_key,
                    unionid: apiResult.unionid || null
                };
                
                console.log('鐪熷疄寰俊API璋冪敤鎴愬姛:', {
                    openid: wechatData.openid,
                    hasSessionKey: !!wechatData.session_key,
                    hasUnionId: !!wechatData.unionid
                });
            } catch (error) {
                console.error('璋冪敤鐪熷疄寰俊API澶辫触:', error);
                return res.status(500).json({
                    success: false,
                    message: `璋冪敤寰俊API澶辫触: ${error.message}`
                });
            }
        }
        
        // 淇濆瓨鐢ㄦ埛鍒版暟鎹簱锛堝湪绠＄悊绯荤粺涓樉绀猴級
        const db = require('../admin/db.js');
        const userId = wechatData.openid; // 浣跨敤openid浣滀负鐢ㄦ埛ID
        if (userId) {
            db.users.createOrUpdate({
                id: userId,
                nickName: userInfo?.nickName || '寰俊鐢ㄦ埛',
                avatarUrl: userInfo?.avatarUrl || '/static/logo.png'
            });
        }
        
        // 杩斿洖缁熶竴鐨勫搷搴旀牸寮?        const response = {
            success: true,
            data: {
                openid: wechatData.openid,
                session_key: wechatData.session_key,
                unionid: wechatData.unionid || null, // 濡傛灉鏈夊紑鏀惧钩鍙帮紝浼氳繑鍥瀠nionid
                userInfo: userInfo || {
                    nickName: '寰俊鐢ㄦ埛',
                    avatarUrl: '/static/logo.png'
                },
                loginTime: new Date().toISOString(),
                isMock: WECHAT_CONFIG.useMock || WECHAT_CONFIG.secret === 'YOUR_APP_SECRET_HERE'
            }
        };
        
        console.log('杩斿洖鐧诲綍鍝嶅簲:', { 
            openid: response.data.openid,
            hasUserInfo: !!userInfo,
            isMock: response.data.isMock
        });
        
        res.json(response);
        
    } catch (error) {
        console.error('寰俊鐧诲綍澶勭悊閿欒:', error);
        res.status(500).json({
            success: false,
            message: "鏈嶅姟鍣ㄥ鐞嗗井淇＄櫥褰曟椂鍑洪敊: " + error.message
        });
    }
});

// 鐢ㄦ埛鎶曠エ锛堣浆鍙戝埌Java鍚庣锛?app.post('/api/user-vote', (req, res) => {
    console.log('鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺?);
    console.log('鉁?/api/user-vote 璺敱琚皟鐢?);
    console.log('馃摜 璇锋眰鏉ユ簮:', req.headers.origin || req.headers.referer || '鏈煡');
    console.log('馃摜 璇锋眰鏂规硶:', req.method);
    console.log('馃摜 璇锋眰鍙傛暟:', req.body);
    console.log('馃摜 璇锋眰澶?', {
        'content-type': req.headers['content-type'],
        'user-agent': req.headers['user-agent']?.substring(0, 50) + '...'
    });
    console.log('鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺?);
    
    // 杞彂鍒癑ava鍚庣锛堢鍙?081锛?    const options = {
        hostname: 'localhost',
        port: 8081,
        path: '/api/user-vote',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        },
        timeout: 5000 // 5绉掕秴鏃?    };
    
    const proxyReq = http.request(options, (proxyRes) => {
        let data = '';
        proxyRes.on('data', (chunk) => {
            data += chunk;
        });
        proxyRes.on('end', () => {
            console.log('馃摜 Java鍚庣鎶曠エ鍝嶅簲:', proxyRes.statusCode, data.substring(0, 200));
            
            // 濡傛灉Java鍚庣鍝嶅簲鎴愬姛锛屾洿鏂版湰鍦?currentVotes 骞跺箍鎾?            if (proxyRes.statusCode >= 200 && proxyRes.statusCode < 300) {
                try {
                    const response = JSON.parse(data);
                    if (response.success && response.data) {
                        // 鏇存柊缃戝叧鍐呭瓨涓殑绁ㄦ暟锛屼繚鎸佸悓姝?                        currentVotes.leftVotes = response.data.leftVotes || 0;
                        currentVotes.rightVotes = response.data.rightVotes || 0;
                        
                        const total = currentVotes.leftVotes + currentVotes.rightVotes;
                        const leftPercentage = total > 0 ? Math.round((currentVotes.leftVotes / total) * 100) : 50;
                        const rightPercentage = total > 0 ? Math.round((currentVotes.rightVotes / total) * 100) : 50;
                        
                        console.log(`鉁?鎶曠エ鎴愬姛锛佸綋鍓嶆€荤エ鏁? 姝ｆ柟 ${currentVotes.leftVotes} (${leftPercentage}%), 鍙嶆柟 ${currentVotes.rightVotes} (${rightPercentage}%)`);
                        
                        // 骞挎挱鎶曠エ鏇存柊缁欐墍鏈?WebSocket 瀹㈡埛绔紙鍖呮嫭鍚庡彴绠＄悊绯荤粺锛?                        broadcast('votes-updated', {
                            leftVotes: currentVotes.leftVotes,
                            rightVotes: currentVotes.rightVotes,
                            leftPercentage: leftPercentage,
                            rightPercentage: rightPercentage,
                            totalVotes: total,
                            userVote: {
                                userId: req.body.userId || 'anonymous',
                                leftVotes: req.body.leftVotes || 0,
                                rightVotes: req.body.rightVotes || 0,
                                mode: req.body.side ? '澧為噺鎶曠エ' : '100绁ㄥ垎閰嶅埗'
                            },
                            timestamp: new Date().toISOString()
                        });
                    }
                } catch (error) {
                    console.error('鉂?瑙ｆ瀽Java鍚庣鍝嶅簲澶辫触:', error.message);
                }
            }
            
            // 灏咼ava鍚庣鐨勫搷搴斿師鏍疯繑鍥炵粰瀹㈡埛绔?            res.status(proxyRes.statusCode);
            res.setHeader('Content-Type', 'application/json');
            res.end(data);
        });
    });
    
    proxyReq.on('error', (error) => {
        console.error('鉂?杞彂鎶曠エ璇锋眰澶辫触:', error.message);
        res.status(500).json({
            success: false,
            message: '鎶曠エ鏈嶅姟鏆傛椂涓嶅彲鐢? ' + error.message
        });
    });
    
    proxyReq.on('timeout', () => {
        console.error('鈴?杞彂鎶曠エ璇锋眰瓒呮椂');
        proxyReq.destroy();
        res.status(504).json({
            success: false,
            message: '鎶曠エ鏈嶅姟鍝嶅簲瓒呮椂'
        });
    });
    
    // 杞彂璇锋眰浣?    proxyReq.write(JSON.stringify(req.body));
    proxyReq.end();
});

// 鐢ㄦ埛鎶曠エ v1锛堣浆鍙戝埌Java鍚庣锛?app.post('/api/v1/user-vote', (req, res) => {
    console.log('鉁?/api/v1/user-vote 璺敱琚皟鐢?);
    console.log('馃摜 璇锋眰鍙傛暟:', req.body);
    
    // 杞彂鍒癑ava鍚庣鐨?/api/v1/user-vote
    const requestBody = JSON.stringify(req.body);
    const options = {
        hostname: 'localhost',
        port: 8081,
        path: '/api/v1/user-vote',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Content-Length': Buffer.byteLength(requestBody, 'utf8')
        },
        timeout: 30000 // 澧炲姞瓒呮椂鏃堕棿鍒?0绉掞紝閬垮厤Tomcat璇诲彇瓒呮椂
    };
    
    const proxyReq = http.request(options, (proxyRes) => {
        let data = '';
        proxyRes.on('data', (chunk) => {
            data += chunk;
        });
        proxyRes.on('end', () => {
            console.log('馃摜 Java鍚庣鎶曠エv1鍝嶅簲:', proxyRes.statusCode, data.substring(0, 200));
            // 灏咼ava鍚庣鐨勫搷搴斿師鏍疯繑鍥炵粰瀹㈡埛绔?            res.status(proxyRes.statusCode);
            res.setHeader('Content-Type', 'application/json');
            res.end(data);
        });
    });
    
    proxyReq.on('error', (error) => {
        console.error('鉂?杞彂鎶曠エv1璇锋眰澶辫触:', error.message);
        res.status(500).json({
            success: false,
            message: '鎶曠エ鏈嶅姟鏆傛椂涓嶅彲鐢? ' + error.message
        });
    });
    
    proxyReq.on('timeout', () => {
        console.error('鈴?杞彂鎶曠エv1璇锋眰瓒呮椂');
        proxyReq.destroy();
        res.status(504).json({
            success: false,
            message: '鎶曠エ鏈嶅姟鍝嶅簲瓒呮椂'
        });
    });
    
    proxyReq.write(requestBody);
    proxyReq.end();
});

// ==================== 鍚庡彴绠＄悊绯荤粺鎺у埗鎺ュ彛 ====================

// 涓€銆佺洿鎾帶鍒舵帴鍙?
// 1.1 寮€濮嬬洿鎾?app.post('/api/admin/live/start', (req, res) => {
	try {
		const { streamId, autoStartAI = false, notifyUsers = true } = req.body;
		
		// 鑾峰彇鐩存挱娴?		const db = require('../admin/db.js');
		let stream = null;
		
		if (streamId) {
			stream = db.streams.getById(streamId);
			if (!stream) {
				return res.status(404).json({
					success: false,
					message: '鎸囧畾鐨勭洿鎾祦涓嶅瓨鍦?
				});
			}
		} else {
			stream = db.streams.getActive();
			if (!stream) {
				return res.status(400).json({
					success: false,
					message: '娌℃湁鍙敤鐨勭洿鎾祦锛岃鍏堥厤缃洿鎾祦'
				});
			}
		}
		
		// 妫€鏌ヨ娴佹槸鍚﹀凡缁忓湪鐩存挱
		if (streamLiveStatuses[stream.id] && streamLiveStatuses[stream.id].isLive) {
			return res.status(409).json({
				success: false,
				message: '璇ョ洿鎾祦宸茬粡鍦ㄨ繘琛屼腑'
			});
		}
		
		// 鈿狅笍 閲嶈锛氬仠姝㈡墍鏈夊叾浠栨鍦ㄧ洿鎾殑娴?		for (const [otherStreamId, status] of Object.entries(streamLiveStatuses)) {
			if (otherStreamId !== stream.id && status.isLive) {
				console.log(`馃洃 鑷姩鍋滄鍏朵粬鐩存挱娴? ${otherStreamId}`);
				streamLiveStatuses[otherStreamId].isLive = false;
				streamLiveStatuses[otherStreamId].stopTime = new Date().toISOString();
				
				// 骞挎挱鍏朵粬娴佸仠姝㈢殑娑堟伅
				broadcast('liveStatus', {
					streamId: otherStreamId,
					isLive: false,
					stopTime: streamLiveStatuses[otherStreamId].stopTime
				});
			}
		}
		
		// 鐢熸垚鐩存挱ID
		const liveId = uuidv4();
		const startTime = new Date().toISOString();
		
		// 鏇存柊璇ユ祦鐨勭洿鎾姸鎬?		streamLiveStatuses[stream.id] = {
			isLive: true,
			liveId: liveId,
			startTime: startTime,
			streamUrl: stream.url,
			streamName: stream.name
		};
		
		// 鏇存柊鍏ㄥ眬鐩存挱鐘舵€侊紙褰撳墠娲昏穬鐨勬祦锛?		globalLiveStatus.isLive = true;
		globalLiveStatus.streamUrl = stream.url;
		globalLiveStatus.streamId = stream.id;
		globalLiveStatus.liveId = liveId;
		globalLiveStatus.startTime = startTime;
		
		// 濡傛灉闇€瑕佽嚜鍔ㄥ惎鍔ˋI
		if (autoStartAI && globalAIStatus.status !== 'running') {
			globalAIStatus.status = 'running';
			globalAIStatus.aiSessionId = uuidv4();
			globalAIStatus.startTime = startTime;
			
			// 鎺ㄩ€丄I鍚姩娑堟伅
			broadcast('aiStatus', {
				status: 'running',
				aiSessionId: globalAIStatus.aiSessionId
			});
		}
		
		// 鎺ㄩ€佺洿鎾紑濮嬫秷鎭埌灏忕▼搴?		if (notifyUsers) {
			broadcast('liveStatus', {
				isLive: true,
				liveId: liveId,
				streamUrl: stream.url,
				startTime: startTime
			});
		}
		
		console.log(`鉁?鐩存挱宸插紑濮? ${liveId}, 娴佸湴鍧€: ${stream.url}`);
		
		res.json({
			success: true,
			data: {
				liveId: liveId,
				streamUrl: stream.url,
				status: 'started',
				startTime: startTime,
				notifiedUsers: wsClients.size
			},
			message: '鐩存挱宸插紑濮?,
			timestamp: Date.now()
		});
		
	} catch (error) {
		console.error('寮€濮嬬洿鎾け璐?', error);
		res.status(500).json({
			success: false,
			message: '寮€濮嬬洿鎾け璐? ' + error.message
		});
	}
});

// 1.2 鍋滄鐩存挱
app.post('/api/admin/live/stop', (req, res) => {
	try {
		const { streamId, saveStatistics = true, notifyUsers = true } = req.body;
		
		// 纭畾瑕佸仠姝㈢殑娴両D
		const targetStreamId = streamId || globalLiveStatus.streamId;
		
		// 濡傛灉鎸囧畾浜唖treamId锛屾鏌ヨ娴佹槸鍚﹀湪鐩存挱
		if (targetStreamId && streamLiveStatuses[targetStreamId] && !streamLiveStatuses[targetStreamId].isLive) {
			return res.json({
				success: true,
				data: {
					status: 'stopped',
					message: '璇ョ洿鎾祦鏈湪鐩存挱锛屾棤闇€鍋滄'
				},
				message: '璇ョ洿鎾祦鏈湪鐩存挱锛屾棤闇€鍋滄',
				timestamp: Date.now()
			});
		}
		
		// 濡傛灉娌℃湁鎸囧畾streamId涓斿叏灞€鐩存挱鏈紑濮嬶紝鐩存帴杩斿洖鎴愬姛
		if (!targetStreamId && !globalLiveStatus.isLive) {
			return res.json({
				success: true,
				data: {
					status: 'stopped',
					message: '鐩存挱鏈紑濮嬶紝鏃犻渶鍋滄'
				},
				message: '鐩存挱鏈紑濮嬶紝鏃犻渶鍋滄',
				timestamp: Date.now()
			});
		}
		
		const stopTime = new Date().toISOString();
		let startTime = null;
		let duration = 0;
		let liveId = null;
		
		// 濡傛灉鎸囧畾浜唖treamId锛屽仠姝㈣娴?		if (targetStreamId && streamLiveStatuses[targetStreamId]) {
			const streamStatus = streamLiveStatuses[targetStreamId];
			if (streamStatus.isLive) {
				startTime = new Date(streamStatus.startTime);
				duration = Math.floor((Date.now() - startTime.getTime()) / 1000);
				liveId = streamStatus.liveId;
				
				// 鏇存柊璇ユ祦鐨勭姸鎬?				streamLiveStatuses[targetStreamId].isLive = false;
				streamLiveStatuses[targetStreamId].stopTime = stopTime;
			}
		} else if (globalLiveStatus.isLive) {
			// 鍋滄鍏ㄥ眬鐩存挱鐘舵€?			startTime = new Date(globalLiveStatus.startTime);
			duration = Math.floor((Date.now() - startTime.getTime()) / 1000);
			liveId = globalLiveStatus.liveId;
		}
		
		// 濡傛灉鍋滄鐨勬槸褰撳墠娲昏穬鐨勬祦锛岄噸缃叏灞€鐘舵€?		if (targetStreamId === globalLiveStatus.streamId || !targetStreamId) {
			globalLiveStatus.isLive = false;
			globalLiveStatus.streamUrl = null;
			globalLiveStatus.streamId = null;
			globalLiveStatus.liveId = null;
			globalLiveStatus.startTime = null;
		}
		
		// 缁熻鏁版嵁
		const summary = {
			totalViewers: wsClients.size,
			peakViewers: wsClients.size,
			totalVotes: currentVotes.leftVotes + currentVotes.rightVotes,
			totalComments: 0,
			totalLikes: 0
		};
		
		// 淇濆瓨缁熻鏁版嵁鍒版暟鎹簱
		if (saveStatistics && duration > 0) {
			const db = require('../admin/db.js');
			db.statistics.updateDashboard({
				totalVotes: summary.totalVotes,
				lastLiveTime: stopTime,
				liveDuration: duration
			});
		}
		
		// 鎺ㄩ€佺洿鎾仠姝㈡秷鎭?		if (notifyUsers) {
			broadcast('liveStatus', {
				streamId: targetStreamId,
				isLive: false,
				liveId: liveId,
				stopTime: stopTime
			});
		}
		
		console.log(`鈴癸笍  鐩存挱宸插仠姝? ${liveId}`);
		
		res.json({
			success: true,
			data: {
				liveId: liveId,
				status: 'stopped',
				stopTime: stopTime,
				duration: duration,
				summary: summary,
				notifiedUsers: wsClients.size
			},
			message: '鐩存挱宸插仠姝?,
			timestamp: Date.now()
		});
		
	} catch (error) {
		console.error('鍋滄鐩存挱澶辫触:', error);
		res.status(500).json({
			success: false,
			message: '鍋滄鐩存挱澶辫触: ' + error.message
		});
	}
});

// 1.3 鏇存柊鎶曠エ鏁版嵁
app.post('/api/admin/live/update-votes', (req, res) => {
	try {
		const { action, leftVotes, rightVotes, reason, notifyUsers = true } = req.body;
		
		if (!action || !['set', 'add', 'reset'].includes(action)) {
			return res.status(400).json({
				success: false,
				message: 'action鍙傛暟蹇呴』鏄? set / add / reset'
			});
		}
		
		const beforeUpdate = {
			leftVotes: currentVotes.leftVotes,
			rightVotes: currentVotes.rightVotes
		};
		
		// 鎵ц鎿嶄綔
		switch (action) {
			case 'set':
				currentVotes.leftVotes = parseInt(leftVotes) || 0;
				currentVotes.rightVotes = parseInt(rightVotes) || 0;
				break;
			case 'add':
				currentVotes.leftVotes += parseInt(leftVotes) || 0;
				currentVotes.rightVotes += parseInt(rightVotes) || 0;
				break;
			case 'reset':
				currentVotes.leftVotes = 0;
				currentVotes.rightVotes = 0;
				break;
		}
		
		const total = currentVotes.leftVotes + currentVotes.rightVotes;
		const afterUpdate = {
			leftVotes: currentVotes.leftVotes,
			rightVotes: currentVotes.rightVotes,
			leftPercentage: total > 0 ? Math.round((currentVotes.leftVotes / total) * 100) : 50,
			rightPercentage: total > 0 ? Math.round((currentVotes.rightVotes / total) * 100) : 50
		};
		
		// 鎺ㄩ€佹洿鏂?		if (notifyUsers) {
			broadcast('votes-updated', afterUpdate);
		}
		
		console.log(`馃搳 鎶曠エ鏁版嵁宸叉洿鏂?(${action}):`, afterUpdate);
		
		res.json({
			success: true,
			data: {
				beforeUpdate,
				afterUpdate,
				updateTime: new Date().toISOString()
			},
			message: '鎶曠エ鏁版嵁宸叉洿鏂?,
			timestamp: Date.now()
		});
		
	} catch (error) {
		console.error('鏇存柊鎶曠エ鏁版嵁澶辫触:', error);
		res.status(500).json({
			success: false,
			message: '鏇存柊鎶曠エ鏁版嵁澶辫触: ' + error.message
		});
	}
});

// 1.4 閲嶇疆鎶曠エ鏁版嵁
app.post('/api/admin/live/reset-votes', (req, res) => {
	try {
		const { resetTo, saveBackup = true, notifyUsers = true } = req.body;
		
		// 澶囦唤褰撳墠鏁版嵁
		const backup = saveBackup ? {
			backupId: uuidv4(),
			leftVotes: currentVotes.leftVotes,
			rightVotes: currentVotes.rightVotes,
			timestamp: new Date().toISOString()
		} : null;
		
		// 閲嶇疆绁ㄦ暟
		if (resetTo) {
			currentVotes.leftVotes = parseInt(resetTo.leftVotes) || 0;
			currentVotes.rightVotes = parseInt(resetTo.rightVotes) || 0;
		} else {
			currentVotes.leftVotes = 0;
			currentVotes.rightVotes = 0;
		}
		
		// 鎺ㄩ€佹洿鏂?		if (notifyUsers) {
			broadcast('votes-updated', {
				leftVotes: currentVotes.leftVotes,
				rightVotes: currentVotes.rightVotes,
				leftPercentage: 50,
				rightPercentage: 50
			});
		}
		
		console.log('馃攧 鎶曠エ鏁版嵁宸查噸缃?);
		
		res.json({
			success: true,
			data: {
				backup,
				currentVotes: {
					leftVotes: currentVotes.leftVotes,
					rightVotes: currentVotes.rightVotes
				}
			},
			message: '鎶曠エ鏁版嵁宸查噸缃?,
			timestamp: Date.now()
		});
		
	} catch (error) {
		console.error('閲嶇疆鎶曠エ鏁版嵁澶辫触:', error);
		res.status(500).json({
			success: false,
			message: '閲嶇疆鎶曠エ鏁版嵁澶辫触: ' + error.message
		});
	}
});

// 浜屻€丄I鎺у埗鎺ュ彛

// 2.1 鍚姩AI璇嗗埆
app.post('/api/admin/ai/start', (req, res) => {
	try {
		const { settings, notifyUsers = true } = req.body;
		
		if (globalAIStatus.status === 'running') {
			return res.status(409).json({
				success: false,
				message: 'AI璇嗗埆宸插湪杩愯涓?
			});
		}
		
		// 鏇存柊璁剧疆
		if (settings) {
			globalAIStatus.settings = {
				...globalAIStatus.settings,
				...settings
			};
		}
		
		// 鍚姩AI
		globalAIStatus.status = 'running';
		globalAIStatus.aiSessionId = uuidv4();
		globalAIStatus.startTime = new Date().toISOString();
		globalAIStatus.statistics = {
			totalContents: 0,
			totalWords: 0,
			averageConfidence: 0
		};
		
		// 鎺ㄩ€丄I鍚姩娑堟伅
		if (notifyUsers) {
			broadcast('aiStatus', {
				status: 'running',
				aiSessionId: globalAIStatus.aiSessionId
			});
		}
		
		console.log(`馃 AI璇嗗埆宸插惎鍔? ${globalAIStatus.aiSessionId}`);
		
		res.json({
			success: true,
			data: {
				aiSessionId: globalAIStatus.aiSessionId,
				status: 'running',
				startTime: globalAIStatus.startTime,
				settings: globalAIStatus.settings
			},
			message: 'AI璇嗗埆宸插惎鍔?,
			timestamp: Date.now()
		});
		
	} catch (error) {
		console.error('鍚姩AI璇嗗埆澶辫触:', error);
		res.status(500).json({
			success: false,
			message: '鍚姩AI璇嗗埆澶辫触: ' + error.message
		});
	}
});

// 2.2 鍋滄AI璇嗗埆
app.post('/api/admin/ai/stop', (req, res) => {
	try {
		const { saveHistory = true, notifyUsers = true } = req.body;
		
		if (globalAIStatus.status === 'stopped') {
			return res.status(400).json({
				success: false,
				message: 'AI璇嗗埆鏈繍琛?
			});
		}
		
		const stopTime = new Date().toISOString();
		const startTime = new Date(globalAIStatus.startTime);
		const duration = Math.floor((Date.now() - startTime.getTime()) / 1000);
		
		const aiSessionId = globalAIStatus.aiSessionId;
		const summary = { ...globalAIStatus.statistics };
		
		// 閲嶇疆鐘舵€?		globalAIStatus.status = 'stopped';
		globalAIStatus.aiSessionId = null;
		globalAIStatus.startTime = null;
		
		// 鎺ㄩ€丄I鍋滄娑堟伅
		if (notifyUsers) {
			broadcast('aiStatus', {
				status: 'stopped',
				aiSessionId: aiSessionId
			});
		}
		
		console.log(`鈴癸笍  AI璇嗗埆宸插仠姝? ${aiSessionId}`);
		
		res.json({
			success: true,
			data: {
				aiSessionId: aiSessionId,
				status: 'stopped',
				stopTime: stopTime,
				duration: duration,
				summary: summary
			},
			message: 'AI璇嗗埆宸插仠姝?,
			timestamp: Date.now()
		});
		
	} catch (error) {
		console.error('鍋滄AI璇嗗埆澶辫触:', error);
		res.status(500).json({
			success: false,
			message: '鍋滄AI璇嗗埆澶辫触: ' + error.message
		});
	}
});

// 2.3 鏆傚仠/鎭㈠AI璇嗗埆
app.post('/api/admin/ai/toggle', (req, res) => {
	try {
		const { action, notifyUsers = true } = req.body;
		
		if (!action || !['pause', 'resume'].includes(action)) {
			return res.status(400).json({
				success: false,
				message: 'action鍙傛暟蹇呴』鏄? pause / resume'
			});
		}
		
		if (action === 'pause') {
			if (globalAIStatus.status !== 'running') {
				return res.status(400).json({
					success: false,
					message: 'AI璇嗗埆鏈繍琛岋紝鏃犳硶鏆傚仠'
				});
			}
			globalAIStatus.status = 'paused';
		} else if (action === 'resume') {
			if (globalAIStatus.status !== 'paused') {
				return res.status(400).json({
					success: false,
					message: 'AI璇嗗埆鏈殏鍋滐紝鏃犳硶鎭㈠'
				});
			}
			globalAIStatus.status = 'running';
		}
		
		// 鎺ㄩ€佺姸鎬佸彉鏇?		if (notifyUsers) {
			broadcast('aiStatus', {
				status: globalAIStatus.status
			});
		}
		
		console.log(`馃 AI璇嗗埆鐘舵€佸凡鍙樻洿: ${globalAIStatus.status}`);
		
		res.json({
			success: true,
			data: {
				aiSessionId: globalAIStatus.aiSessionId,
				status: globalAIStatus.status,
				actionTime: new Date().toISOString()
			},
			message: globalAIStatus.status === 'paused' ? 'AI璇嗗埆宸叉殏鍋? : 'AI璇嗗埆宸叉仮澶?,
			timestamp: Date.now()
		});
		
	} catch (error) {
		console.error('鍒囨崲AI鐘舵€佸け璐?', error);
		res.status(500).json({
			success: false,
			message: '鍒囨崲AI鐘舵€佸け璐? ' + error.message
		});
	}
});

// 2.4 鍒犻櫎AI鍐呭
app.delete('/api/admin/ai/content/:contentId', (req, res) => {
	try {
		const { contentId } = req.params;
		const { reason, notifyUsers = true } = req.body;
		
		if (!contentId) {
			return res.status(400).json({
				success: false,
				message: '缂哄皯鍐呭ID'
			});
		}
		
		// 杩欓噷搴旇浠庢暟鎹簱鍒犻櫎AI鍐呭
		// 鏆傛椂妯℃嫙鍒犻櫎鎴愬姛
		
		// 鎺ㄩ€佸垹闄ゆ秷鎭?		if (notifyUsers) {
			broadcast('aiContentDeleted', {
				contentId: contentId
			});
		}
		
		console.log(`馃棏锔? AI鍐呭宸插垹闄? ${contentId}`);
		
		res.json({
			success: true,
			data: {
				contentId: contentId,
				deleteTime: new Date().toISOString(),
				reason: reason || '绠＄悊鍛樺垹闄?
			},
			message: '鍐呭宸插垹闄?,
			timestamp: Date.now()
		});
		
	} catch (error) {
		console.error('鍒犻櫎AI鍐呭澶辫触:', error);
		res.status(500).json({
			success: false,
			message: '鍒犻櫎AI鍐呭澶辫触: ' + error.message
		});
	}
});

// 涓夈€佹暟鎹煡璇㈡帴鍙?
// 3.1 瀹炴椂鏁版嵁姒傝
app.get('/api/admin/dashboard', (req, res) => {
	try {
		const db = require('../admin/db.js');
		const users = db.users.getAll();
		const debate = db.debate.get();
		
		const totalVotes = currentVotes.leftVotes + currentVotes.rightVotes;
		const leftPercentage = totalVotes > 0 ? Math.round((currentVotes.leftVotes / totalVotes) * 100) : 50;
		const rightPercentage = totalVotes > 0 ? Math.round((currentVotes.rightVotes / totalVotes) * 100) : 50;
		
		// 璁＄畻鐩存挱鏃堕暱
		let liveDuration = 0;
		if (globalLiveStatus.isLive && globalLiveStatus.startTime) {
			const startTime = new Date(globalLiveStatus.startTime);
			liveDuration = Math.floor((Date.now() - startTime.getTime()) / 1000);
		}
		
		// 鑾峰彇鍚敤鐨勭洿鎾祦锛堜粠鏁版嵁搴撴煡璇紝鍗充娇鐩存挱鏈紑濮嬩篃浼氳繑鍥烇級
		let activeStream = null;
		try {
			activeStream = db.streams.getActive();
		} catch (error) {
			console.warn('鑾峰彇鍚敤鐩存挱娴佸け璐?', error);
		}
		
		const data = {
			totalUsers: users.length,
			activeUsers: wsClients.size,
			isLive: globalLiveStatus.isLive,
			liveStreamUrl: globalLiveStatus.streamUrl,
			streamId: globalLiveStatus.streamId || null, // 褰撳墠鐩存挱浣跨敤鐨勬祦ID
			// 娣诲姞鍚敤鐨勭洿鎾祦淇℃伅锛堜粠鏁版嵁搴撴煡璇紝鏂逛究灏忕▼搴忚幏鍙栨祴璇曟祦鍦板潃锛?			activeStreamUrl: activeStream ? activeStream.url : null,
			activeStreamId: activeStream ? activeStream.id : null,
			activeStreamName: activeStream ? activeStream.name : null,
			totalVotes: totalVotes,
			leftVotes: currentVotes.leftVotes,
			rightVotes: currentVotes.rightVotes,
			leftPercentage: leftPercentage,
			rightPercentage: rightPercentage,
			totalComments: 0,  // 鍙粠鏁版嵁搴撹幏鍙?			totalLikes: 0,     // 鍙粠鏁版嵁搴撹幏鍙?			aiStatus: globalAIStatus.status,
			debateTopic: {
				title: debate.title,
				leftSide: debate.leftPosition,
				rightSide: debate.rightPosition,
				description: debate.description
			},
			liveStartTime: globalLiveStatus.startTime,
			liveDuration: liveDuration
		};
		
		res.json({
			success: true,
			data: data,
			timestamp: Date.now()
		});
		
	} catch (error) {
		console.error('鑾峰彇鏁版嵁姒傝澶辫触:', error);
		res.status(500).json({
			success: false,
			message: '鑾峰彇鏁版嵁姒傝澶辫触: ' + error.message
		});
	}
});

// 3.2 鐢ㄦ埛鍒楄〃
app.get('/api/admin/miniprogram/users', (req, res) => {
	try {
		const db = require('../admin/db.js');
		const users = db.users.getAll();
		
		const page = parseInt(req.query.page) || 1;
		const pageSize = parseInt(req.query.pageSize) || 20;
		const status = req.query.status || 'all';
		const orderBy = req.query.orderBy || 'joinTime';
		
		// 杩囨护鐢ㄦ埛
		let filteredUsers = users;
		if (status === 'online') {
			// 绠€鍖栧鐞嗭細鍋囪鎵€鏈塛ebSocket杩炴帴鐨勭敤鎴烽兘鏄湪绾?			filteredUsers = users.filter(u => wsClients.size > 0);
		}
		
		// 鎺掑簭
		filteredUsers.sort((a, b) => {
			if (orderBy === 'votes') {
				return (b.statistics?.totalVotes || 0) - (a.statistics?.totalVotes || 0);
			}
			return new Date(b.joinTime) - new Date(a.joinTime);
		});
		
		// 鍒嗛〉
		const total = filteredUsers.length;
		const start = (page - 1) * pageSize;
		const end = start + pageSize;
		const paginatedUsers = filteredUsers.slice(start, end);
		
		res.json({
			success: true,
			data: {
				total: total,
				page: page,
				pageSize: pageSize,
				users: paginatedUsers.map(u => ({
					userId: u.id,
					nickname: u.nickname,
					avatar: u.avatar,
					status: 'online',  // 绠€鍖栧鐞?					lastActiveTime: new Date().toISOString(),
					statistics: u.statistics || {
						totalVotes: 0,
						totalComments: 0,
						totalLikes: 0,
						currentPosition: 'neutral'
					},
					joinTime: u.createdAt || new Date().toISOString()
				}))
			},
			timestamp: Date.now()
		});
		
	} catch (error) {
		console.error('鑾峰彇鐢ㄦ埛鍒楄〃澶辫触:', error);
		res.status(500).json({
			success: false,
			message: '鑾峰彇鐢ㄦ埛鍒楄〃澶辫触: ' + error.message
		});
	}
});

// 3.3 鎶曠エ缁熻
app.get('/api/admin/votes/statistics', (req, res) => {
	try {
		const timeRange = req.query.timeRange || '1h';
		
		const totalVotes = currentVotes.leftVotes + currentVotes.rightVotes;
		const leftPercentage = totalVotes > 0 ? Math.round((currentVotes.leftVotes / totalVotes) * 100) : 50;
		const rightPercentage = totalVotes > 0 ? Math.round((currentVotes.rightVotes / totalVotes) * 100) : 50;
		
		// 绠€鍖栵細鐢熸垚妯℃嫙鏃堕棿杞存暟鎹?		const timeline = [];
		const now = new Date();
		for (let i = 0; i < 10; i++) {
			const time = new Date(now.getTime() - i * 60000);  // 姣忓垎閽熶竴涓偣
			timeline.unshift({
				timestamp: time.toISOString(),
				leftVotes: Math.floor(currentVotes.leftVotes * (10 - i) / 10),
				rightVotes: Math.floor(currentVotes.rightVotes * (10 - i) / 10),
				totalVotes: Math.floor(totalVotes * (10 - i) / 10),
				activeUsers: wsClients.size
			});
		}
		
		res.json({
			success: true,
			data: {
				summary: {
					totalVotes: totalVotes,
					leftVotes: currentVotes.leftVotes,
					rightVotes: currentVotes.rightVotes,
					leftPercentage: leftPercentage,
					rightPercentage: rightPercentage,
					growthRate: 5.2
				},
				timeline: timeline,
				topVoters: []  // 鍙粠鏁版嵁搴撹幏鍙?			},
			timestamp: Date.now()
		});
		
	} catch (error) {
		console.error('鑾峰彇鎶曠エ缁熻澶辫触:', error);
		res.status(500).json({
			success: false,
			message: '鑾峰彇鎶曠エ缁熻澶辫触: ' + error.message
		});
	}
});

// 3.4 AI鍐呭鍒楄〃锛堝凡鍦ㄤ笂闈㈠畾涔夛紝姝ゅ鍒犻櫎閲嶅瀹氫箟锛?
// ==================== 鐩存挱娴佺鐞嗘帴鍙?====================

// 鑾峰彇鎵€鏈夌洿鎾祦鍒楄〃
/**
 * 鐢熸垚鎾斁鍦板潃锛坧layUrls锛? * 鏍规嵁娴佺被鍨嬭嚜鍔ㄧ敓鎴?HLS銆丗LV銆丷TMP 鎾斁鍦板潃
 */
function generatePlayUrls(stream) {
	const playUrls = {
		hls: null,
		flv: null,
		rtmp: null
	};
	
	try {
		// 鑾峰彇鏈嶅姟鍣↖P鍦板潃锛堢敤浜庣敓鎴愯浆鎹㈠悗鐨勬挱鏀惧湴鍧€锛?		const serverIP = process.env.SERVER_IP || '192.168.31.249';
		const hlsServerPort = process.env.HLS_SERVER_PORT || '8086';
		const rtmpServerPort = process.env.RTMP_SERVER_PORT || '1935';
		
		// 浠庡師URL涓彁鍙栨祦鍚嶇О锛堢敤浜嶳TMP杞琀LS锛?		const getStreamName = (url) => {
			try {
				const urlObj = new URL(url);
				const path = urlObj.pathname;
				// 鎻愬彇璺緞鐨勬渶鍚庝竴閮ㄥ垎浣滀负娴佸悕绉?				// 渚嬪: rtmp://localhost/live/stream1 -> stream1
				const parts = path.split('/').filter(p => p);
				return parts[parts.length - 1] || 'stream';
			} catch (e) {
				// 濡傛灉URL瑙ｆ瀽澶辫触锛屽皾璇曚粠瀛楃涓蹭腑鎻愬彇
				const match = url.match(/([^\/]+)(?:\.[^\.]+)?$/);
				return match ? match[1] : 'stream';
			}
		};
		
		switch (stream.type) {
			case 'hls':
				// HLS娴佺洿鎺ヤ娇鐢ㄥ師鍦板潃
				playUrls.hls = stream.url;
				// 灏濊瘯浠嶩LS鍦板潃鐢熸垚FLV鍦板潃锛堝鏋滃彲鑳斤級
				if (stream.url.includes('.m3u8')) {
					playUrls.flv = stream.url.replace('.m3u8', '.flv');
				}
				break;
				
			case 'rtmp':
				// RTMP娴侀渶瑕佽浆鎹负HLS
				const streamName = getStreamName(stream.url);
				// 鐢熸垚HLS鎾斁鍦板潃锛堥€氳繃娴佸獟浣撴湇鍔″櫒杞崲锛?				playUrls.hls = `http://${serverIP}:${hlsServerPort}/live/${streamName}.m3u8`;
				playUrls.flv = `http://${serverIP}:${hlsServerPort}/live/${streamName}.flv`;
				playUrls.rtmp = stream.url.replace('localhost', serverIP).replace(/^rtmp:\/\//, `rtmp://${serverIP}:${rtmpServerPort}/`);
				break;
				
			case 'flv':
				// FLV娴?				playUrls.flv = stream.url;
				// 灏濊瘯浠嶧LV鍦板潃鐢熸垚HLS鍦板潃
				if (stream.url.includes('.flv')) {
					const streamName = getStreamName(stream.url);
					playUrls.hls = `http://${serverIP}:${hlsServerPort}/live/${streamName}.m3u8`;
				}
				break;
				
			default:
				// 鏈煡绫诲瀷锛屽皾璇曚娇鐢ㄥ師鍦板潃
				playUrls.hls = stream.url;
				break;
		}
		
		// 纭繚鑷冲皯鏈変竴涓挱鏀惧湴鍧€
		if (!playUrls.hls && stream.url) {
			playUrls.hls = stream.url;
		}
		
	} catch (error) {
		console.error('鐢熸垚鎾斁鍦板潃澶辫触:', error);
		// 濡傛灉鐢熸垚澶辫触锛岃嚦灏戜娇鐢ㄥ師URL浣滀负HLS鍦板潃
		playUrls.hls = stream.url;
	}
	
	return playUrls;
}

app.get('/api/admin/streams', (req, res) => {
	try {
		const streams = db.streams.getAll();
		
		// 涓烘瘡涓祦娣诲姞鐩存挱鐘舵€佸拰鎾斁鍦板潃
		const streamsWithStatus = streams.map(stream => {
			const status = streamLiveStatuses[stream.id] || { isLive: false };
			
			// 鐢熸垚鎾斁鍦板潃锛坧layUrls锛?			const playUrls = generatePlayUrls(stream);
			
			return {
				...stream,
				// 鉁?鏂板锛氭挱鏀惧湴鍧€瀛楁
				playUrls: playUrls,
				liveStatus: {
					isLive: status.isLive || false,
					liveId: status.liveId || null,
					startTime: status.startTime || null,
					stopTime: status.stopTime || null,
					streamUrl: status.streamUrl || stream.url
				}
			};
		});
		
		res.json({
			success: true,
			data: {
				streams: streamsWithStatus,
				total: streams.length
			},
			timestamp: Date.now()
		});
		
	} catch (error) {
		console.error('鑾峰彇鐩存挱娴佸垪琛ㄥけ璐?', error);
		res.status(500).json({
			success: false,
			message: '鑾峰彇鐩存挱娴佸垪琛ㄥけ璐? ' + error.message
		});
	}
});

// 娣诲姞鏂扮殑鐩存挱娴?app.post('/api/admin/streams', (req, res) => {
	try {
		const { name, url, type, description, enabled } = req.body;
		
		// 鍙傛暟楠岃瘉
		if (!name || !url || !type) {
			return res.status(400).json({
				success: false,
				message: '缂哄皯蹇呰鍙傛暟: name, url, type 蹇呭～'
			});
		}
		
		// 楠岃瘉URL鏍煎紡
		try {
			new URL(url);
		} catch (e) {
			return res.status(400).json({
				success: false,
				message: '娴佸湴鍧€鏍煎紡涓嶆纭紝璇疯緭鍏ユ湁鏁堢殑URL'
			});
		}
		
		// 楠岃瘉type
		if (!['hls', 'rtmp', 'flv'].includes(type)) {
			return res.status(400).json({
				success: false,
				message: 'type 蹇呴』鏄?hls, rtmp 鎴?flv'
			});
		}
		
		// 鍒涘缓鏂版祦
		const newStream = {
			id: `stream-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
			name: name.trim(),
			url: url.trim(),
			type,
			description: description ? description.trim() : '',
			enabled: enabled !== false, // 榛樿鍚敤
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString()
		};
		
		// 淇濆瓨鍒版暟鎹簱
		db.streams.add(newStream);
		
		console.log('鉁?鏂板鐩存挱娴?', newStream.name, newStream.url);
		
		res.json({
			success: true,
			data: newStream,
			message: '鐩存挱娴佹坊鍔犳垚鍔?,
			timestamp: Date.now()
		});
		
	} catch (error) {
		console.error('娣诲姞鐩存挱娴佸け璐?', error);
		res.status(500).json({
			success: false,
			message: '娣诲姞鐩存挱娴佸け璐? ' + error.message
		});
	}
});

// 鏇存柊鐩存挱娴?app.put('/api/admin/streams/:id', (req, res) => {
	try {
		const streamId = req.params.id; // 缁熶竴浣跨敤 :id 鍙傛暟鍚?		const { name, url, type, description, enabled } = req.body;
		
		// 鏌ユ壘娴?		const stream = db.streams.getById(streamId);
		if (!stream) {
			return res.status(404).json({
				success: false,
				message: '鐩存挱娴佷笉瀛樺湪'
			});
		}
		
		// 楠岃瘉URL鏍煎紡锛堝鏋滄湁鏇存柊锛?		if (url) {
			try {
				new URL(url);
			} catch (e) {
				return res.status(400).json({
					success: false,
					message: '娴佸湴鍧€鏍煎紡涓嶆纭紝璇疯緭鍏ユ湁鏁堢殑URL'
				});
			}
		}
		
		// 楠岃瘉type锛堝鏋滄湁鏇存柊锛?		if (type && !['hls', 'rtmp', 'flv'].includes(type)) {
			return res.status(400).json({
				success: false,
				message: 'type 蹇呴』鏄?hls, rtmp 鎴?flv'
			});
		}
		
		// 鏇存柊瀛楁
		const updates = {};
		if (name !== undefined) updates.name = name.trim();
		if (url !== undefined) updates.url = url.trim();
		if (type !== undefined) updates.type = type;
		if (description !== undefined) updates.description = description.trim();
		if (enabled !== undefined) updates.enabled = enabled;
		updates.updatedAt = new Date().toISOString();
		
		// 淇濆瓨鏇存柊
		const updatedStream = db.streams.update(streamId, updates);
		
		console.log('鉁?鏇存柊鐩存挱娴?', streamId, updates);
		
		res.json({
			success: true,
			data: updatedStream,
			message: '鐩存挱娴佹洿鏂版垚鍔?,
			timestamp: Date.now()
		});
		
	} catch (error) {
		console.error('鏇存柊鐩存挱娴佸け璐?', error);
		res.status(500).json({
			success: false,
			message: '鏇存柊鐩存挱娴佸け璐? ' + error.message
		});
	}
});

// 鍒犻櫎鐩存挱娴?app.delete('/api/admin/streams/:id', (req, res) => {
	try {
		const streamId = req.params.id; // 缁熶竴浣跨敤 :id 鍙傛暟鍚?		
		// 鏌ユ壘娴?		const stream = db.streams.getById(streamId);
		if (!stream) {
			return res.status(404).json({
				success: false,
				message: '鐩存挱娴佷笉瀛樺湪'
			});
		}
		
		// 妫€鏌ユ槸鍚︽鍦ㄤ娇鐢?		if (globalLiveStatus && globalLiveStatus.streamId === streamId) {
			return res.status(400).json({
				success: false,
				message: '璇ョ洿鎾祦姝ｅ湪浣跨敤涓紝璇峰厛鍋滄鐩存挱'
			});
		}
		
		// 鍒犻櫎
		db.streams.delete(streamId);
		
		console.log('鉁?鍒犻櫎鐩存挱娴?', streamId, stream.name);
		
		res.json({
			success: true,
			data: {
				id: streamId,
				name: stream.name
			},
			message: '鐩存挱娴佸垹闄ゆ垚鍔?,
			timestamp: Date.now()
		});
		
	} catch (error) {
		console.error('鍒犻櫎鐩存挱娴佸け璐?', error);
		res.status(500).json({
			success: false,
			message: '鍒犻櫎鐩存挱娴佸け璐? ' + error.message
		});
	}
});

// 鍚姩鏈嶅姟鍣?server.listen(port, '0.0.0.0', () => {
    console.log('');
    printConfig();
    console.log(`杈╅: ${debateTopic.title}`);
    console.log(`鐘舵€? 鉁?鏈嶅姟鍣ㄨ繍琛屼腑`);
    if (wss) {
        console.log(`馃寪 WebSocket 鏈嶅姟宸插惎鍔? ws://localhost:${port}/ws`);
    }
    console.log('鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺?);
    console.log('');
    
    // 鍙湪妯℃嫙妯″紡涓嬪惎鍔ㄦā鎷熸暟鎹?    if (currentConfig.mode === 'mock') {
        simulateVoteChanges();
        simulateNewAIContent();
        console.log('馃 妯℃嫙鏁版嵁鐢熸垚鍣ㄥ凡鍚姩');
    }
    
    // 鍚姩鐩存挱璁″垝妫€鏌?    startScheduleCheck();
    console.log('鈴?鐩存挱璁″垝瀹氭椂妫€鏌ュ凡鍚姩');
});

module.exports = app;

