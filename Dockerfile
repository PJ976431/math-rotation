# 使用官方的 Node.js 18 轻量级镜像
FROM node:18-alpine

# 设置容器内的工作目录
WORKDIR /app

# 复制 package.json 和 package-lock.json (如果有的话)
COPY package*.json ./

# 安装生产环境依赖
RUN npm install --production

# 复制项目所有文件到工作目录
COPY . .

# 创建数据和上传目录（防止运行时找不到目录报错）
RUN mkdir -p /app/data /app/public/uploads

# 声明应用运行的端口
EXPOSE 3000

# 启动应用
CMD ["node", "server.js"]
