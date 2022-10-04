import React from 'react';
import { useState } from 'react';
import { useEffect } from 'react';
import { over } from 'stompjs';
import SockJS from "sockjs-client";

var stompClient = null;
const ChatRoom = () => {

    const [tab, setTab] = useState("chatRoom")
    const [publicChat, setpublicChat] = useState([]);
    const [privateChat, setprivateChat] = useState(new Map());
    const [userData, setUserData] = useState({
        sender: "",
        receiver: "",
        status: false,
        message: ""
    });

    useEffect(() => {
        console.log(userData);
    }, [userData])


    const handleUserName = (event) => {
        const { value } = event.target;
        setUserData({ ...userData, "sender": value });
    }

    const handleMessage = (event) => {
        const { value } = event.target;
        setUserData({ ...userData, "message": value });
    }

    const registerUser = () => {
        connect();
    }

    const connect = () => {
        let Sock = new SockJS('http://localhost:8080/ws');
        stompClient = over(Sock);
        stompClient.connect({}, onConnected, onError);
    }

    const onConnected = () => {
        setUserData({ ...userData, "connected": true });
        stompClient.subscribe('/chatRoom/public', onPublicMessageReceived);
        stompClient.subscribe('/user/' + userData.userName + 'private', onPrivateMessageReceived);
        userJoin();
    }

    const onPublicMessageReceived = (payload) => {
        let payloadData = JSON.parse(payload.body);
        if (payloadData.status == "JOINED") {
            if (!privateChat.get(payloadData.senderName)) {
                privateChat.set(payloadData.senderName, []);
                setprivateChat(new Map(privateChat));
            }
            return;
        }
        if (payloadData.status == "MESSAGE") {
            publicChat.push(payloadData);
            setpublicChat([...publicChat])
            return;
        }
    }

    const onError = (err) => {
        console.log(err);
    }

    const onPrivateMessageReceived = (payload) => {
        let payloadData = JSON.parse(payload);

        if (privateChat.get(payloadData.sender)) {
            privateChat.get(payloadData.sender).push(payloadData);
            setprivateChat(new Map(privateChat));
        } else {
            let list = [];
            list.push(payloadData);
            privateChat.set(payloadData.sender, list);
            setprivateChat(new Map(privateChat));
        }
    }

    const sendPublicMessage = () => {
        if (stompClient) {
            let messageSend = {
                sender: userData.sender,
                message: userData.message,
                status: 'MESSAGE'
            };
            console.log(messageSend.sender + " " + messageSend.message);
            stompClient.send('/chatApp/message', {}, JSON.stringify(messageSend));
            setUserData({ ...userData, "message": "" });
        }
    }

    const sendPrivateMessage = () => {
        if (stompClient) {
            let message = {
                sender: userData.sender,
                receiver: tab,
                message: userData.message,
                status: 'MESSAGE'
            };
            if (userData !== tab) {
                privateChat.set(tab).push(message);
                setprivateChat(new Map());
            }
            stompClient.send('/chatApp/privateMessage', {}, JSON.stringify(message));
            setUserData({ ...userData, "message": "" });
        }
    }

    const userJoin = () => {
        let message = {
            sender: userData.sender,
            message: userData.message,
            status: 'JOINED'
        };
        stompClient.send('/chatApp/message', {}, JSON.stringify(message));
        console.log('burda');
    }

    return (
        <div className="container">
            {userData.connected ?
                <div className="chat-box">
                    <div className="member-list">
                        <ul>
                            <li onClick={() => { setTab("chatRoom") }} className={`member ${tab === "chatRoom" && "active"}`}>Chat Room</li>
                            {[...privateChat.keys()].map((name, index) => (
                                <li onClick={setTab(name)} className={`member ${tab === name && "active"}`} key={index}>
                                    {name}
                                </li>
                            ))}
                        </ul>
                    </div>
                    {tab === "chatRoom" && <div className="chat-content">
                        <ul className="chat-messages">
                            {publicChat.map((chat, index) => (
                                <li className={`member ${chat.sender === userData.sender && "self"}`} key={index}>
                                    {chat.sender !== userData.sender && <div className="avatar">{chat.sender}</div>}
                                    <div className="message-data">{chat.message}</div>
                                    {chat.sender === userData.sender && <div className="avatar-self">{chat.sender}</div>}
                                </li>
                            ))}
                        </ul>
                        <div className="send-message">
                            <input type="text" className="input-message" placeholder="Enter public message" value={userData.message} onChange={handleMessage} />
                            <button type="button" className="send-button" onClick={sendPublicMessage}>Send</button>
                        </div>

                    </div>}
                    {tab !== "chatRoom" && <div className="chat-content">
                        <ul className="chat-messages">
                            {[...privateChat.get(tab)].map((chat, index) => (
                                <li className={`message ${chat.sender === userData.username && "self"}`} key={index}>
                                    {chat.sender !== userData.sender && <div className="avatar">{chat.sender}</div>}
                                    <div className="message-data">{chat.message}</div>
                                    {chat.sender === userData.sender && <div className="avatar self">{chat.sender}</div>}
                                </li>
                            ))}
                        </ul>
                        <div className="send-message">
                            <input type="text" className="input-message" placeholder="Enter private message ${tab}" value={userData.message} onChange={handleMessage} />
                            <button type="button" className="send-button" onClick={sendPrivateMessage}>Send</button>
                        </div>
                    </div>}
                </div>
                :
                <div className="register">
                    <input
                        id="user-name"
                        placeholder=" Kullanıcı adı giriniz"
                        value={userData.sender}
                        onChange={handleUserName}
                    />
                    <button type="button" onClick={registerUser}>
                        Connect
                    </button>
                </div>}
            </div>
    );
}

export default ChatRoom
