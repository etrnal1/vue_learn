import express from 'express';
import pool from '../db.js';

const router = express.Router();

// POST /api/migrate - 迁移 localStorage 数据到 MySQL
router.post('/', async (req, res) => {
  const data = req.body;

  const connection = await pool.getConnection();
  let stats = {
    users: 0,
    tickets: 0,
    ticketComments: 0,
    serviceRequests: 0,
    requestComments: 0,
    articles: 0,
    flows: 0,
    flowSteps: 0,
    flowReleases: 0,
    chats: 0,
    chatComments: 0,
    codeSnippets: 0,
    currentUser: null
  };

  try {
    await connection.beginTransaction();

    // 1. 迁移用户
    if (data.itsm_users) {
      const users = JSON.parse(data.itsm_users);
      for (const user of users) {
        await connection.query(
          `INSERT INTO users (id, name, role, avatar, email, created_at)
           VALUES (?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE
           name = VALUES(name), role = VALUES(role), avatar = VALUES(avatar), email = VALUES(email)`,
          [user.id, user.name, user.role, user.avatar || '👨‍💻', user.email || null, user.createdAt || Date.now()]
        );
        stats.users++;
      }
    }

    // 2. 迁移当前用户设置
    if (data.itsm_currentUser) {
      const currentUser = JSON.parse(data.itsm_currentUser);
      if (currentUser && currentUser.id) {
        await connection.query(
          `INSERT INTO user_settings (setting_key, setting_value)
           VALUES ('current_user_id', ?)
           ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)`,
          [currentUser.id]
        );
        stats.currentUser = currentUser.id;
      }
    }

    // 3. 迁移工单
    if (data.itsm_tickets) {
      const tickets = JSON.parse(data.itsm_tickets);
      for (const ticket of tickets) {
        await connection.query(
          `INSERT INTO tickets (
            id, ticket_no, title, description, category, priority, status,
            assignee_id, reporter_id, related_article_ids, attachments,
            created_at, updated_at, resolved_at, closed_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
          title = VALUES(title), description = VALUES(description), status = VALUES(status)`,
          [
            ticket.id,
            ticket.ticketNo,
            ticket.title,
            ticket.description || null,
            ticket.category || null,
            ticket.priority || 'medium',
            ticket.status || 'new',
            ticket.assigneeId || null,
            ticket.reporterId || null,
            JSON.stringify(ticket.relatedArticleIds || []),
            JSON.stringify(ticket.attachments || []),
            ticket.createdAt || Date.now(),
            ticket.updatedAt || Date.now(),
            ticket.resolvedAt || null,
            ticket.closedAt || null
          ]
        );
        stats.tickets++;

        // 迁移工单评论
        if (ticket.comments && ticket.comments.length > 0) {
          for (const comment of ticket.comments) {
            await connection.query(
              `INSERT INTO ticket_comments (id, ticket_id, user_id, text, created_at)
               VALUES (?, ?, ?, ?, ?)
               ON DUPLICATE KEY UPDATE text = VALUES(text)`,
              [comment.id, ticket.id, comment.userId || null, comment.text, comment.createdAt || Date.now()]
            );
            stats.ticketComments++;
          }
        }
      }
    }

    // 4. 迁移服务请求
    if (data.itsm_serviceRequests) {
      const requests = JSON.parse(data.itsm_serviceRequests);
      for (const request of requests) {
        await connection.query(
          `INSERT INTO service_requests (
            id, request_no, service_type, title, description, priority, status,
            requester_id, approver_id, assignee_id, approval_note,
            created_at, updated_at, approved_at, completed_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
          title = VALUES(title), status = VALUES(status)`,
          [
            request.id,
            request.requestNo,
            request.serviceType || null,
            request.title,
            request.description || null,
            request.priority || 'medium',
            request.status || 'submitted',
            request.requesterId || null,
            request.approverId || null,
            request.assigneeId || null,
            request.approvalNote || null,
            request.createdAt || Date.now(),
            request.updatedAt || Date.now(),
            request.approvedAt || null,
            request.completedAt || null
          ]
        );
        stats.serviceRequests++;

        // 迁移服务请求评论
        if (request.comments && request.comments.length > 0) {
          for (const comment of request.comments) {
            await connection.query(
              `INSERT INTO request_comments (id, request_id, user_id, text, created_at)
               VALUES (?, ?, ?, ?, ?)
               ON DUPLICATE KEY UPDATE text = VALUES(text)`,
              [comment.id, request.id, comment.userId || null, comment.text, comment.createdAt || Date.now()]
            );
            stats.requestComments++;
          }
        }
      }
    }

    // 5. 迁移知识库文章
    if (data.itsm_articles) {
      const articles = JSON.parse(data.itsm_articles);
      for (const article of articles) {
        await connection.query(
          `INSERT INTO articles (
            id, article_no, title, content, category, tags, author_id, view_count,
            created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
          title = VALUES(title), content = VALUES(content)`,
          [
            article.id,
            article.articleNo,
            article.title,
            article.content || null,
            article.category || null,
            JSON.stringify(article.tags || []),
            article.authorId || null,
            article.viewCount || 0,
            article.createdAt || Date.now(),
            article.updatedAt || Date.now()
          ]
        );
        stats.articles++;
      }
    }

    // 6. 迁移流程
    if (data.itsm_flows) {
      const flows = JSON.parse(data.itsm_flows);
      for (const flow of flows) {
        await connection.query(
          `INSERT INTO flows (id, flow_no, name, description, icon, author_id, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE
           name = VALUES(name), description = VALUES(description)`,
          [
            flow.id,
            flow.flowNo,
            flow.name,
            flow.description || null,
            flow.icon || null,
            flow.authorId || null,
            flow.createdAt || Date.now(),
            flow.updatedAt || Date.now()
          ]
        );
        stats.flows++;

        // 迁移流程步骤
        if (flow.steps && flow.steps.length > 0) {
          // 先删除旧步骤
          await connection.query('DELETE FROM flow_steps WHERE flow_id = ?', [flow.id]);

          for (const step of flow.steps) {
            await connection.query(
              `INSERT INTO flow_steps (id, flow_id, step_order, name, description, assignee, duration, conditional)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                step.id,
                flow.id,
                step.order,
                step.name,
                step.description || null,
                step.assignee || null,
                step.duration || null,
                step.conditional || false
              ]
            );
            stats.flowSteps++;
          }
        }
      }
    }

    // 7. 迁移流程发布历史
    if (data.itsm_flowReleases) {
      const releases = JSON.parse(data.itsm_flowReleases);
      for (const release of releases) {
        await connection.query(
          `INSERT INTO flow_releases (id, flow_id, version, note, payload, created_at)
           VALUES (?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE
           version = VALUES(version), note = VALUES(note),
           payload = VALUES(payload), created_at = VALUES(created_at)`,
          [
            release.id,
            release.flow_id ?? release.flowId,
            release.version,
            release.note || null,
            JSON.stringify(release.payload ?? release.data ?? null),
            release.created_at || release.createdAt || Date.now()
          ]
        );
        stats.flowReleases++;
      }
    }

    // 8. 迁移聊天记录
    if (data.chat_history) {
      const chats = JSON.parse(data.chat_history);
      for (const chat of chats) {
        await connection.query(
          `INSERT INTO chats (id, title, content, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE
           title = VALUES(title), content = VALUES(content)`,
          [
            chat.id,
            chat.title,
            chat.content || null,
            chat.createdAt || Date.now(),
            chat.updatedAt || Date.now()
          ]
        );
        stats.chats++;

        // 迁移聊天评论
        if (chat.comments && chat.comments.length > 0) {
          for (const comment of chat.comments) {
            await connection.query(
              `INSERT INTO chat_comments (id, chat_id, text, created_at)
               VALUES (?, ?, ?, ?)
               ON DUPLICATE KEY UPDATE text = VALUES(text)`,
              [comment.id, chat.id, comment.text, comment.createdAt || Date.now()]
            );
            stats.chatComments++;
          }
        }
      }
    }

    // 8. 迁移代码片段
    if (data.code_snippets) {
      const snippets = JSON.parse(data.code_snippets);
      for (const snippet of snippets) {
        await connection.query(
          `INSERT INTO code_snippets (name, description, code, language, created_at)
           VALUES (?, ?, ?, ?, ?)`,
          [
            snippet.name,
            snippet.description || null,
            snippet.code,
            snippet.language || null,
            snippet.timestamp || Date.now()
          ]
        );
        stats.codeSnippets++;
      }
    }

    // 9. 更新计数器
    if (data.itsm_ticketCounter) {
      await connection.query(
        "UPDATE counters SET value = ? WHERE id = 'ticket'",
        [parseInt(data.itsm_ticketCounter) || 0]
      );
    }
    if (data.itsm_requestCounter) {
      await connection.query(
        "UPDATE counters SET value = ? WHERE id = 'request'",
        [parseInt(data.itsm_requestCounter) || 0]
      );
    }
    if (data.itsm_articleCounter) {
      await connection.query(
        "UPDATE counters SET value = ? WHERE id = 'article'",
        [parseInt(data.itsm_articleCounter) || 0]
      );
    }
    if (data.itsm_flowCounter) {
      await connection.query(
        "UPDATE counters SET value = ? WHERE id = 'flow'",
        [parseInt(data.itsm_flowCounter) || 0]
      );
    }

    await connection.commit();

    console.log('✅ 数据迁移成功:', stats);
    res.json({ success: true, stats });

  } catch (error) {
    await connection.rollback();
    console.error('❌ 数据迁移失败:', error);
    res.status(500).json({ error: error.message, stats });
  } finally {
    connection.release();
  }
});

// GET /api/migrate/export - 导出当前数据库数据
router.get('/export', async (req, res) => {
  try {
    const exportData = {};

    // 导出用户
    const [users] = await pool.query('SELECT * FROM users');
    exportData.itsm_users = JSON.stringify(users);

    // 导出当前用户
    const [currentUserSetting] = await pool.query(
      "SELECT setting_value FROM user_settings WHERE setting_key = 'current_user_id'"
    );
    if (currentUserSetting.length > 0) {
      const [currentUser] = await pool.query('SELECT * FROM users WHERE id = ?', [currentUserSetting[0].setting_value]);
      exportData.itsm_currentUser = JSON.stringify(currentUser[0]);
    }

    // 导出工单（含评论）
    const [tickets] = await pool.query('SELECT * FROM tickets');
    for (const ticket of tickets) {
      const [comments] = await pool.query('SELECT * FROM ticket_comments WHERE ticket_id = ?', [ticket.id]);
      ticket.comments = comments;
      ticket.relatedArticleIds = ticket.related_article_ids ? JSON.parse(ticket.related_article_ids) : [];
      ticket.attachments = ticket.attachments ? JSON.parse(ticket.attachments) : [];
    }
    exportData.itsm_tickets = JSON.stringify(tickets);

    // 导出服务请求（含评论）
    const [requests] = await pool.query('SELECT * FROM service_requests');
    for (const request of requests) {
      const [comments] = await pool.query('SELECT * FROM request_comments WHERE request_id = ?', [request.id]);
      request.comments = comments;
    }
    exportData.itsm_serviceRequests = JSON.stringify(requests);

    // 导出知识库文章
    const [articles] = await pool.query('SELECT * FROM articles');
    const processedArticles = articles.map(a => ({
      ...a,
      tags: a.tags ? JSON.parse(a.tags) : []
    }));
    exportData.itsm_articles = JSON.stringify(processedArticles);

    // 导出流程（含步骤）
    const [flows] = await pool.query('SELECT * FROM flows');
    for (const flow of flows) {
      const [steps] = await pool.query('SELECT * FROM flow_steps WHERE flow_id = ? ORDER BY step_order', [flow.id]);
      flow.steps = steps;
    }
    exportData.itsm_flows = JSON.stringify(flows);

    const [releases] = await pool.query('SELECT * FROM flow_releases ORDER BY created_at ASC');
    exportData.itsm_flowReleases = JSON.stringify(releases);

    // 导出聊天记录（含评论）
    const [chats] = await pool.query('SELECT * FROM chats');
    for (const chat of chats) {
      const [comments] = await pool.query('SELECT * FROM chat_comments WHERE chat_id = ?', [chat.id]);
      chat.comments = comments;
    }
    exportData.chat_history = JSON.stringify(chats);

    // 导出代码片段
    const [snippets] = await pool.query('SELECT * FROM code_snippets');
    exportData.code_snippets = JSON.stringify(snippets);

    // 导出计数器
    const [counters] = await pool.query('SELECT * FROM counters');
    counters.forEach(counter => {
      exportData[`itsm_${counter.id}Counter`] = counter.value.toString();
    });

    res.json(exportData);
  } catch (error) {
    console.error('导出数据失败:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
