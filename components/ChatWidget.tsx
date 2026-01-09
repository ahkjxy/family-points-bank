import { useState, useEffect, useRef } from "react";
import { Profile } from "../types";
import { supabase } from "../supabaseClient";
import { Icon } from "./Icon";
import { useToast } from "./Toast";
import { LocalNotifications } from "@capacitor/local-notifications";

const EMOJIS = [
  "😀",
  "😃",
  "😄",
  "😁",
  "😆",
  "😅",
  "🤣",
  "😂",
  "🙂",
  "😊",
  "😇",
  "🥰",
  "😍",
  "🤩",
  "😘",
  "😗",
  "😚",
  "😙",
  "😋",
  "😛",
  "😜",
  "🤪",
  "😝",
  "🤑",
  "🤗",
  "🤭",
  "🤫",
  "🤔",
  "🤐",
  "🤨",
  "😐",
  "😑",
  "😶",
  "😏",
  "😒",
  "🙄",
  "😬",
  "🤥",
  "😔",
  "😪",
  "🤤",
  "😴",
  "😷",
  "🤒",
  "🤕",
  "🤢",
  "🤮",
  "🤧",
  "🥵",
  "🥶",
  "🥴",
  "😵",
  "🤯",
  "🤠",
  "🥳",
  "😎",
  "🤓",
  "🧐",
  "🥸",
  "😕",
  "😟",
  "🙁",
  "😮",
  "😯",
  "😲",
  "😳",
  "🥺",
  "😦",
  "😧",
  "😨",
  "😰",
  "😥",
  "😢",
  "😭",
  "😤",
  "😡",
  "👍",
  "👎",
  "👏",
  "🙌",
  "🤝",
  "💪",
  "🎉",
  "🎊",
  "❤️",
  "💖",
  "💕",
  "💗",
  "💙",
  "💚",
  "💛",
  "🧡",
  "💜",
  "🖤",
  "🤍",
  "💯",
  "🌟",
  "⭐",
  "🔥",
  "💥",
  "✨",
  "🎁",
  "🎈",
  "🎂",
];

interface ChatMessage {
  id: string;
  sender_id: string;
  sender_name: string;
  content: string;
  created_at: string;
}

const SYSTEM_MESSAGE_PREFIX = "[系统]";

interface ChatWidgetProps {
  currentProfile: Profile;
  familyId: string;
  profiles: Profile[];
}

export function ChatWidget({ currentProfile, familyId, profiles }: ChatWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const { showToast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const setupNotifications = async () => {
      try {
        if (typeof window !== "undefined" && !(window as any).Capacitor) return;
        const { display } = await LocalNotifications.requestPermissions();

        if (display === "granted") {
          await LocalNotifications.createChannel({
            id: "chat-notifications",
            name: "聊天消息",
            description: "家庭成员发送的消息通知",
            importance: 5,
            visibility: 1,
            sound: "default",
            lights: true,
            vibration: true,
          });

          await LocalNotifications.registerActionTypes({
            types: [
              {
                id: "CHAT_MESSAGE",
                actions: [
                  {
                    id: "open-chat",
                    title: "打开聊天",
                    destructive: false,
                  },
                ],
              },
            ],
          });

          await LocalNotifications.addListener("localNotificationActionPerformed", () => {
            setIsOpen(true);
            setUnreadCount(0);
          });
        } else {
          console.log("Notification permission denied");
        }
      } catch (error) {
        console.error("Failed to setup notifications:", error);
      }
    };

    setupNotifications();

    return () => {
      LocalNotifications.removeAllListeners();
    };
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const loadMessages = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from("messages")
          .select("*")
          .eq("family_id", familyId)
          .order("created_at", { ascending: true })
          .limit(50);

        if (error) throw error;
        setMessages(data || []);
      } catch (error) {
        console.error("Failed to load messages:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadMessages();

    const channel = supabase
      .channel(`family:${familyId}:messages`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `family_id=eq.${familyId}`,
        },
        async (payload) => {
          const newMsg = payload.new as ChatMessage;

          setMessages((prev) => [...prev, newMsg]);
          if (!isOpen) {
            setUnreadCount((prev) => prev + 1);
          }

          if (newMsg.sender_id !== currentProfile.id && !isSystemMessage(newMsg.content)) {
            try {
              await LocalNotifications.schedule({
                notifications: [
                  {
                    title: `${newMsg.sender_name} 发送了消息`,
                    body: newMsg.content,
                    id: Date.now(),
                    schedule: { at: new Date() },
                    sound: "default",
                    channelId: "chat-notifications",
                    actionTypeId: "CHAT_MESSAGE",
                  },
                ],
              });
              console.log("Notification scheduled successfully");
            } catch (error) {
              console.error("Failed to schedule notification:", error);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isOpen, familyId]);

  const handleOpen = async () => {
    setIsOpen(true);
    setUnreadCount(0);
    showToast({
      type: "info",
      title: "进入聊天室",
      description: "现在可以与家庭成员实时交流了",
    });

    try {
      const { error } = await supabase.from("messages").insert({
        family_id: familyId,
        sender_id: currentProfile.id,
        sender_name: currentProfile.name,
        content: `${SYSTEM_MESSAGE_PREFIX} ${currentProfile.name} 进入了聊天室`,
      });

      if (error) {
        console.error("Failed to send join message:", error);
      }
    } catch (error) {
      console.error("Failed to send join message:", error);
    }
  };

  const handleClose = async () => {
    setIsOpen(false);
    setIsMinimized(false);
    showToast({
      type: "info",
      title: "离开聊天室",
      description: "你已退出聊天室",
    });

    try {
      const { error } = await supabase.from("messages").insert({
        family_id: familyId,
        sender_id: currentProfile.id,
        sender_name: currentProfile.name,
        content: `${SYSTEM_MESSAGE_PREFIX} ${currentProfile.name} 离开了聊天室`,
      });

      if (error) {
        console.error("Failed to send leave message:", error);
      }
    } catch (error) {
      console.error("Failed to send leave message:", error);
    }
  };

  const handleToggleMinimize = () => {
    setIsMinimized(!isMinimized);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newMessage.trim();
    if (!trimmed.trim()) return;

    try {
      const { error } = await supabase.from("messages").insert({
        family_id: familyId,
        sender_id: currentProfile.id,
        sender_name: currentProfile.name,
        content: trimmed,
      });

      if (error) throw error;
      setNewMessage("");
    } catch (error) {
      showToast({
        type: "error",
        title: "发送失败",
        description: (error as Error)?.message || "请稍后重试",
      });
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);

    if (minutes < 1) return "刚刚";
    if (minutes < 60) return `${minutes}分钟前`;
    if (minutes < 1440) return `${Math.floor(minutes / 60)}小时前`;
    return date.toLocaleDateString("zh-CN");
  };

  const getMemberName = (senderId: string) => {
    const profile = profiles.find((p) => p.id === senderId);
    return profile?.name || "未知成员";
  };

  const isOwnMessage = (senderId: string) => senderId === currentProfile.id;
  const isSystemMessage = (content: string) => content.startsWith(SYSTEM_MESSAGE_PREFIX);
  const isJoinMessage = (content: string) => content.includes("进入了聊天室");
  const isLeaveMessage = (content: string) => content.includes("离开了聊天室");

  const handleEmojiClick = (emoji: string) => {
    setNewMessage((prev) => prev + emoji);
    setShowEmojiPicker(false);
  };

  return (
    <>
      {!isOpen && (
        <button
          onClick={handleOpen}
          className={`fixed bottom-24 right-6 z-50 w-14 h-14 bg-gradient-to-br from-[#FF4D94] to-[#7C4DFF] rounded-full shadow-lg flex items-center justify-center hover:scale-110 transition-transform duration-300 group ${
            unreadCount > 0 ? "animate-shake" : ""
          }`}
        >
          <Icon name="bell" size={24} className="text-white" />
          {unreadCount > 0 && (
            <div className="absolute -top-1 -right-1 w-6 h-6 bg-rose-500 rounded-full flex items-center justify-center text-white text-[10px] font-bold animate-pulse">
              {unreadCount > 9 ? "9+" : unreadCount}
            </div>
          )}
        </button>
      )}

      {isOpen && (
        <div
          className={`fixed bottom-6 right-6 z-50 w-80 sm:w-96 bg-white dark:bg-[#1E293B] rounded-[32px] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] border border-gray-100 dark:border-white/10 flex flex-col transition-all duration-300 ${isMinimized ? "h-16" : "h-[500px]"}`}
        >
          <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#FF4D94] to-[#7C4DFF] flex items-center justify-center text-white font-black">
                <Icon name="bell" size={16} />
              </div>
              <div>
                <h3 className="text-sm font-black text-gray-900 dark:text-white">家庭聊天室</h3>
                <p className="text-[10px] text-gray-400">{profiles.length} 位成员在线</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleToggleMinimize}
                className="w-8 h-8 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 flex items-center justify-center text-gray-400 transition-colors"
              >
                <Icon name={isMinimized ? "plus" : "history"} size={14} />
              </button>
              <button
                onClick={handleClose}
                className="w-8 h-8 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 flex items-center justify-center text-gray-400 hover:text-rose-500 transition-colors"
              >
                <Icon name="plus" size={14} className="rotate-45" />
              </button>
            </div>
          </div>

          {!isMinimized && (
            <>
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {isLoading ? (
                  <div className="flex items-center justify-center h-full text-gray-400 text-sm">
                    加载中...
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-gray-400 text-sm">
                    暂无消息，开始聊天吧！
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isSystem = isSystemMessage(msg.content);

                    if (isSystem) {
                      const isJoin = isJoinMessage(msg.content);
                      const isLeave = isLeaveMessage(msg.content);

                      if (isJoin) {
                        return (
                          <div key={msg.id} className="flex justify-center my-2">
                            <div className="px-4 py-2 bg-gradient-to-r from-[#FF4D94]/10 to-[#7C4DFF]/10 dark:from-[#FF4D94]/20 dark:to-[#7C4DFF]/20 rounded-full text-xs font-bold text-[#FF4D94] dark:text-[#7C4DFF] border border-[#FF4D94]/20 dark:border-[#7C4DFF]/20">
                              {msg.content.replace(SYSTEM_MESSAGE_PREFIX, "")}
                            </div>
                          </div>
                        );
                      }

                      if (isLeave) {
                        return (
                          <div key={msg.id} className="flex justify-center my-2">
                            <div className="px-4 py-2 bg-gray-100/80 dark:bg-white/10 rounded-full text-xs font-bold text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-white/20">
                              {msg.content.replace(SYSTEM_MESSAGE_PREFIX, "")}
                            </div>
                          </div>
                        );
                      }

                      return null;
                    }

                    return (
                      <div
                        key={msg.id}
                        className={`flex ${isOwnMessage(msg.sender_id) ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[80%] ${isOwnMessage(msg.sender_id) ? "order-2" : "order-1"}`}
                        >
                          {!isOwnMessage(msg.sender_id) && (
                            <p className="text-[10px] text-gray-400 mb-1 ml-1">
                              {getMemberName(msg.sender_id)}
                            </p>
                          )}
                          <div
                            className={`p-3 rounded-2xl text-sm ${
                              isOwnMessage(msg.sender_id)
                                ? "bg-gradient-to-r from-[#FF4D94] to-[#7C4DFF] text-white rounded-br-md"
                                : "bg-gray-100 dark:bg-white/10 text-gray-900 dark:text-white rounded-bl-md"
                            }`}
                          >
                            <p className="break-words">{msg.content}</p>
                            <p
                              className={`text-[9px] mt-1 ${isOwnMessage(msg.sender_id) ? "text-white/70" : "text-gray-400"}`}
                            >
                              {formatTime(msg.created_at)}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              <form
                onSubmit={handleSendMessage}
                className="p-4 border-t border-gray-100 dark:border-white/10 relative"
              >
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    className="w-12 h-12 rounded-2xl flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/5 transition-all"
                  >
                    <span className="text-xl">😀</span>
                  </button>
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="输入消息..."
                    className="flex-1 px-4 py-3 bg-gray-50 dark:bg-white/5 border border-transparent dark:border-white/5 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-[#FF4D94] transition-all"
                  />
                  <button
                    type="submit"
                    disabled={!newMessage.trim()}
                    className="w-12 h-12 bg-gradient-to-r from-[#FF4D94] to-[#7C4DFF] rounded-2xl flex items-center justify-center text-white disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 transition-transform"
                  >
                    <Icon name="plus" size={18} className="rotate-45" />
                  </button>
                </div>

                {showEmojiPicker && (
                  <div className="absolute bottom-20 right-4 bg-white dark:bg-[#1E293B] rounded-2xl shadow-2xl border border-gray-100 dark:border-white/10 p-4 w-64 max-h-48 overflow-y-auto z-50">
                    <div className="grid grid-cols-8 gap-1">
                      {EMOJIS.map((emoji) => (
                        <button
                          key={emoji}
                          type="button"
                          onClick={() => handleEmojiClick(emoji)}
                          className="w-8 h-8 flex items-center justify-center text-2xl hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-colors"
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </form>
            </>
          )}
        </div>
      )}
    </>
  );
}
