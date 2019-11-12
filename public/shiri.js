//QRコード生成ライブラリ
Vue.use(window['vue-qriously']);

let app = new Vue({
	el: '#app',
	data: {
		message: '',
		userID: Math.random().toString(36).slice(-8),
		redID: '',
		blueID: '',
		chatList: [],
		chatText: '',
		updatedAt: '',
		endWord:'',
		status:'',
		qrurl: location.href,
		qrshow: false,
		timer:'',
		timerobj:'',
		settime:'',
	},
	//起動時に実行
	created:function(){
		// firebaseの設定
		this.setFirebase().then(()=>{
			// 各監視メソッド呼び出し
			this.observeGame();
			this.observeRoom();
			this.observeChat();
		})
	},
  
	//処理
	methods:{
		//firebaseの設定
		setFirebase: function(){
			var firebaseConfig = {
					apiKey: "AIzaSyDppR-NT3BBdHUXS2LuYGzhEd8eLZt-Lkw",
					authDomain: "firetest-87b4e.firebaseapp.com",
					databaseURL: "https://firetest-87b4e.firebaseio.com",
					projectId: "firetest-87b4e",
					storageBucket: "firetest-87b4e.appspot.com",
					messagingSenderId: "574223382702",
					appId: "1:574223382702:web:ffb6c8a35fe5d57e2c953f"
			};
			// Initialize Firebase
			firebase.initializeApp(firebaseConfig);
			
			return new Promise((resolve, reject)=>{
				firebase.database().ref("/.info/serverTimeOffset").on('value', (offset) => {
					var offsetVal = offset.val() || 0;
					this.timestampOffset = offsetVal;
					resolve();
				});
			})
		},
	  
		//部屋の入退出を監視、{{redID}}{{blueID}}タグに反映
		observeRoom: function(){
			var db = firebase.database();
			var redID;
			var blueID;
			db.ref("/my/player").on('value', function(snapshot) { 
				redID = snapshot.child("red").val();
				blueID = snapshot.child("blue").val(); 
				app.redID = redID;
				app.blueID = blueID;
				console.log("NowRoom Red：" + redID + ", Blue：" + blueID)
			});
		},

		//メッセージの読み取り、監視、{{chatList}}タグに反映
		observeChat: function(){
			var db = firebase.database();
			var chatdata = [];
			//mychat読み取り
			db.ref("/my/chat").on('child_added',function(snapshot){
				var msg = snapshot.val();
				chatdata.push({
					text:  msg.text,
					createdAt: msg.createdAt,
					user: msg.user,
					team: msg.team
				});
			});
			//表示に反映
			this.chatList = chatdata;
		},
	  
		//ゲーム状態の監視、{{endWord}}{{status}}タグに反映。
		observeGame: function(){
			var db = firebase.database();
			db.ref("/my/game").on("value", function(snapshot) { 
				app.updatedAt = snapshot.child("updatedAt").val(); 
				app.endWord = snapshot.child("endWord").val();
				app.status = snapshot.child("status").val();
				
				//カウントダウンイベント発火
				app.timerStart();
			});
		},
	  
		//入退室処理
		changeRoom: function(color){
			var db = firebase.database();
			var userId = this.userID;
			var enemy = (color == "red") ? "blue" : "red";

			//firebaseからplayerを取得
			db.ref("/my/player").once("value").then(function(snapshot) {
				var roomplayer = snapshot.child(color).val();
				var enemyplayer = snapshot.child(enemy).val();
	    	  
				//両部屋に入れないようにする
				if(userId == enemyplayer && userId.length>0){
					app.showMessage(102);
					return;
				}
	    	  
				//空室のとき入室処理
				if(roomplayer.length == 0 ){
					//入室処理
					db.ref("/my/player/" + color).set(userId);
					app.showMessage(110);
					console.log(color + "入室 -> ID:"+ userId);
					
					//両部屋埋まったときstatus変更
					if(enemyplayer.length>0){
						db.ref("/my/game/status").set("waitStart");
					}

				//部屋内同IDのとき退出処理
				}else if(roomplayer == userId){
				//退出処理
					db.ref("/my/player/" + color).set("");
					db.ref("/my/game/status").set("waitEntry");
					app.showMessage(111);
					console.log(color + "退室 <- ID:"+ userId);
		      
				//在席済みのとき
				}else{
					app.showMessage(101);
					return;
				}
			});
		}, 
	  
		//部屋の追い出し処理
		exitRoom: function(){
			var db = firebase.database();
			db.ref("/my/player/" + "red").set("");
			db.ref("/my/player/" + "blue").set("");
			db.ref("/my/game/endWord").set("");
			db.ref("/my/game/status").set("waitEntry");
			this.showMessage(120);
		},
	  
		//メッセージの送信
		sendChat: function(){
			//文字列長さチェック
			if(this.chatText.length ==0){
				return;
			}
		
			//回答権チェック
			if(this.status == "waitRed" && this.userID == this.redID){
				color = "red";
			}else if(this.status == "waitBlue" && this.userID == this.blueID){
				color = "blue";
			}else{
				this.showMessage(500);
				return;
			}
		
			//ひらがなチェック
			if(!this.chatText.match(/^[ぁ-んー　]*$/)){    //"ー"の後ろの文字は全角スペース。
				this.showMessage(520);
				return;
			}
		
			/* 頭文字取得 */
			chatInitial = this.chatText.slice(0,1);
			if(chatInitial != this.endWord){
				this.showMessage(521);
				return;
			}
			/* 末尾取得 */
			chatEndWord = this.chatText.slice(-1);
		  
			/* 伸ばし棒取得。1字前参照 */
			if(chatEndWord =='ー'){
				chatEndWord = this.chatText.slice(this.chatText.length -2, this.chatText.length -1);
				
			//小さいやつらは自力で変換
			}else if(chatEndWord =='ぁ'){ chatEndWord= 'あ';
			}else if(chatEndWord =='ぃ'){ chatEndWord= 'い';
			}else if(chatEndWord =='ぅ'){ chatEndWord= 'う';
			}else if(chatEndWord =='ぇ'){ chatEndWord= 'え';
			}else if(chatEndWord =='ぉ'){ chatEndWord= 'お';
			}else if(chatEndWord =='ゃ'){ chatEndWord= 'や';
			}else if(chatEndWord =='ゅ'){ chatEndWord= 'ゆ';
			}else if(chatEndWord =='ょ'){ chatEndWord= 'よ'; 	  
			}
		  
			var db = firebase.database();
			
			//回答の重複を取得
			var duplicate = false;
			db.ref('my/chat').orderByChild('text').equalTo(this.chatText).once('value',function(snapshot){
				duplicate = !snapshot.val() //重複ならfalseが返る
			});
		  
			//データベースに投稿（push）
			var chatRef = db.ref().child('my/chat').push()
			chatRef.set({
				text: chatText.value,
				user: this.userID,
				createdAt: firebase.database.ServerValue.TIMESTAMP,
				team:color
			});
			
			//チャットボックスを空欄にする
			this.chatText = "";
	     
			//重複チェック
			if(!duplicate){
				var status = (this.status == "waitRed") ? "BlueWin" : "RedWin";
				this.showMessage(550);
			 
			//末尾が「ん」をチェック
			}else if(chatEndWord =='ん'){
				var status = (this.status == "waitRed") ? "BlueWin" : "RedWin";
				this.showMessage(551);
			
			}else{
				var status = (this.status == "waitRed") ? "waitBlue" : "waitRed";
			}
		 
			//データベースに投稿（set）
			db.ref("/my/game/endWord").set(chatEndWord);
			db.ref("/my/game/updatedAt").set(firebase.database.ServerValue.TIMESTAMP);
			db.ref("/my/game/status").set(status);
		},
		
		//ゲーム開始
		startGame: function(){
			switch(this.status){
			case 'waitEntry':
				this.showMessage(300);
				return;
				break;
			case 'waitStart':
			case 'RedWin':
			case 'BlueWin':
				if(this.userID != this.redID && this.userID != this.blueID){
					this.showMessage(301);
					return;
				}
				break;
			default:
				return;
				break;
			}

			this.showMessage(302);
			console.log("GameStart");
				
			var db = firebase.database();
			db.ref("/my/game/updatedAt").set(firebase.database.ServerValue.TIMESTAMP);
			
			/* 開始処理 */
			//先行決め
			let dummyList = ['red','blue'];
			turn =  dummyList[Math.floor(Math.random() * dummyList.length)];
			
			var status = (turn == "red") ? "waitRed" : "waitBlue";
			db.ref("/my/game/status").set(status);
			
			
			
			//ランダムなひらがな1文字を生成
			let wordList = "あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよわ";
			endWord =  wordList[~~(Math.random() * wordList.length)];
			db.ref("/my/game/endWord").set(endWord);

			console.log(endWord + "で始まる言葉。回答者：" + turn);

			//チャットDB再構築
			db.ref("/my/chat").set("");
			var chatRef = db.ref().child('my/chat').push();
			chatRef.set({
				text: 'ゲームを開始しました',
				user: 'Admin',
				createdAt: firebase.database.ServerValue.TIMESTAMP,
				team:''
			});
		},
		
		//timerイベント	  
		timerStart: function(){
			//timerobjをクリア
			clearInterval(this.timerobj);
			
			//現在との差分時間
			var nowtime = Date.now();
			var diftime = Math.floor((nowtime - this.updatedAt)/1000); //[sec]
			
			console.log(60 - diftime + "sec後 timeout")
			//60sを超えたら強制退出
			if(this.status!='waitStart' && diftime>60){
				console.log("timeout " + diftime + "sec")
				this.exitRoom();
			}
			
			//制限時間
			this.settime = 10; //[sec]
			if(this.settime > diftime){
				this.timer = this.settime;
				//カウントダウン開始
				this.timerobj = setInterval(() => this.countdown(), 10);
			}
		},
		
		//countdownイベント
		countdown: function(){
			if(this.timer > 0){
				this.timer = this.timer-0.01;
				console.log("remain " + this.timer + "sec")
				
			}else{							
				//タイマーストップ（timerobjをクリア）
				clearInterval(this.timerobj);
				console.log("timeup!!")
				
				var status = (this.status == "waitRed") ? "BlueWin" : "RedWin";
				var db = firebase.database();
				db.ref("/my/game/status").set(status);
			}
		},
		
		//{{message}}に表示するメソッド
		showMessage: function(no){
			var msg
			if(no == 100){ msg = "参加者待ちです。";
			}else if(no == 101){	 msg= "既に参加者がいます。入室できません。";
			}else if(no == 102){	 msg= "既に在席済みです。入室できません。";
			}else if(no == 110){	 msg = "入室しました。";
			}else if(no == 111){	 msg = "退出しました。";
			}else if(no == 120){	 msg = "ゲームを終了しました。";
			}else if(no == 300){	 msg = "参加者不足のため開始できません。";
			}else if(no == 301){	 msg = "参加者以外は開始できません。";
			}else if(no == 302){	 msg = "ゲームを開始します。";
			}else if(no == 500){	 msg = "回答権がありません。";
			}else if(no == 520){	 msg = "ひらがな以外の文字が含まれています。";
			}else if(no == 521){	 msg = "頭文字が正しくありません。";
			}else if(no == 550){	 msg = "回答済みの単語です。あなたの負け。";
			}else if(no == 551){	 msg = "最後に「ん」がつきました。あなたの負け。";
			}else if(no == 999){	 msg = "";
			}else{
				msg = "不正な値を検出しました err:" + no;
			}
			this.message = msg
		}
	},
	
	computed: {
		// createdAtで並べ替え
		sort_chatList_createdAt(){
			return this.chatList.sort((a, b) => {
			return (a.createdAt > b.createdAt) ? -1 : (a.createdAt < b.createdAt) ? 1 : 0;});
		}
	},
	
	//日付フォーマット
	filters: {
		moment: function (date) {
			return moment(date).format('YYYY/MM/DD HH:mm');// eslint-disable-line
		}
	},
})
