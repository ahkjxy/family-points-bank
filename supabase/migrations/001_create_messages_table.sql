-- 创建消息表
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    family_id TEXT NOT NULL,
    sender_id TEXT NOT NULL,
    sender_name TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- 添加索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_messages_family_id ON public.messages(family_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages(created_at DESC);

-- 启用行级安全策略
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- 允许同家庭成员读取消息
CREATE POLICY "Allow family members to read messages"
ON public.messages
FOR SELECT
USING (
    family_id = (
        SELECT family_id
        FROM public.families
        WHERE id = messages.family_id
        LIMIT 1
    )
);

-- 允许同家庭成员插入消息
CREATE POLICY "Allow family members to insert messages"
ON public.messages
FOR INSERT
WITH CHECK (
    family_id = (
        SELECT family_id
        FROM public.families
        WHERE id = NEW.family_id
        LIMIT 1
    )
);

-- 设置实时订阅权限
CREATE PUBLICATION messages_pub FOR TABLE public.messages;
