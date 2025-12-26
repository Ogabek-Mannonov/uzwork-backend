// src/controllers/aiController.js
const pool = require('../db/pool');

/**
 * POST /ai/job-match
 * AI-based job recommendations for freelancer
 */
const jobMatch = async (req, res) => {
  try {
    const userId = req.user.id;

    // Get freelancer skills
    const profileResult = await pool.query(
      'SELECT skills FROM user_profiles WHERE user_id = $1',
      [userId]
    );

    const skills = profileResult.rows.length > 0 ? profileResult.rows[0].skills : [];

    // Simple matching algorithm (can be enhanced with ML)
    const jobsQuery = `
      SELECT 
        p.*,
        u.first_name as client_first_name,
        u.last_name as client_last_name,
        (SELECT COUNT(*) FROM proposals WHERE project_id = p.id) as proposals_count
      FROM projects p
      JOIN users u ON p.client_id = u.id
      WHERE p.status = 'open'
        AND ($1::text[] IS NULL OR p.skills && $1::text[])
      ORDER BY 
        CASE WHEN p.skills && $1::text[] THEN 1 ELSE 2 END,
        p.created_at DESC
      LIMIT 10
    `;

    const result = await pool.query(jobsQuery, [skills || null]);

    res.json({
      success: true,
      message: 'Sizga mos loyihalar',
      data: {
        jobs: result.rows
      }
    });
  } catch (error) {
    console.error('Job match error:', error);
    res.status(500).json({
      success: false,
      message: 'Loyihalarni topishda xato yuz berdi.',
      error: error.message
    });
  }
};

/**
 * POST /ai/translate
 * Translate text (uz, ru, en)
 */
const translate = async (req, res) => {
  try {
    const { text, from_lang, to_lang } = req.body;

    if (!text || !from_lang || !to_lang) {
      return res.status(400).json({
        success: false,
        message: 'Text, from_lang va to_lang kerak.'
      });
    }

    // TODO: Integrate with translation API (Google Translate, Yandex, etc.)
    // For now, return mock translation
    const translations = {
      'uz-ru': {
        'salom': 'привет',
        'loyiha': 'проект'
      },
      'ru-uz': {
        'привет': 'salom',
        'проект': 'loyiha'
      },
      'uz-en': {
        'salom': 'hello',
        'loyiha': 'project'
      },
      'en-uz': {
        'hello': 'salom',
        'project': 'loyiha'
      }
    };

    const key = `${from_lang}-${to_lang}`;
    const translatedText = translations[key]?.[text.toLowerCase()] || text;

    res.json({
      success: true,
      data: {
        original_text: text,
        translated_text: translatedText,
        from_lang,
        to_lang
      }
    });
  } catch (error) {
    console.error('Translate error:', error);
    res.status(500).json({
      success: false,
      message: 'Tarjima qilishda xato yuz berdi.',
      error: error.message
    });
  }
};

/**
 * POST /ai/portfolio-generate
 * Generate portfolio using AI
 */
const generatePortfolio = async (req, res) => {
  try {
    const userId = req.user.id;
    const { skills, experience } = req.body;

    // TODO: Integrate with AI service (OpenAI, etc.)
    // For now, return mock portfolio structure

    const portfolio = {
      bio: `Experienced ${skills?.join(', ') || 'developer'} with ${experience || 'extensive'} experience.`,
      portfolio_items: [
        {
          title: 'Sample Project 1',
          description: 'AI generated portfolio item',
          skills: skills || []
        }
      ]
    };

    res.json({
      success: true,
      message: 'Portfolio yaratildi!',
      data: {
        portfolio
      }
    });
  } catch (error) {
    console.error('Generate portfolio error:', error);
    res.status(500).json({
      success: false,
      message: 'Portfolio yaratishda xato yuz berdi.',
      error: error.message
    });
  }
};

/**
 * POST /ai/proposal-writer
 * AI proposal writer
 */
const proposalWriter = async (req, res) => {
  try {
    const { project_id, freelancer_id } = req.body;

    if (!project_id || !freelancer_id) {
      return res.status(400).json({
        success: false,
        message: 'Project_id va freelancer_id kerak.'
      });
    }

    // Get project and freelancer info
    const [projectResult, freelancerResult] = await Promise.all([
      pool.query('SELECT title, description, skills FROM projects WHERE id = $1', [project_id]),
      pool.query('SELECT up.skills, up.bio FROM user_profiles up WHERE up.user_id = $1', [freelancer_id])
    ]);

    if (projectResult.rows.length === 0 || freelancerResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Loyiha yoki freelancer topilmadi.'
      });
    }

    // TODO: Integrate with AI service
    // Generate proposal based on project and freelancer skills
    const coverLetter = `Salom! Men ${projectResult.rows[0].title} loyihasini bajarishga qiziqaman. Mening tajribam va ko'nikmalarim bu loyihaga mos keladi.`;

    res.json({
      success: true,
      data: {
        cover_letter: coverLetter,
        suggested_rate: null, // Can be calculated based on project budget
        estimated_days: null
      }
    });
  } catch (error) {
    console.error('Proposal writer error:', error);
    res.status(500).json({
      success: false,
      message: 'Taklif yozishda xato yuz berdi.',
      error: error.message
    });
  }
};

/**
 * POST /ai/proposal-score
 * Score proposal using AI
 */
const proposalScore = async (req, res) => {
  try {
    const { proposal_id } = req.body;

    if (!proposal_id) {
      return res.status(400).json({
        success: false,
        message: 'Proposal_id kerak.'
      });
    }

    // Get proposal
    const proposalResult = await pool.query(
      'SELECT cover_letter, project_id FROM proposals WHERE id = $1',
      [proposal_id]
    );

    if (proposalResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Taklif topilmadi.'
      });
    }

    // TODO: Integrate with AI service for scoring
    // Simple scoring based on cover letter length and keywords
    const coverLetter = proposalResult.rows[0].cover_letter;
    let score = 50; // Base score

    if (coverLetter.length > 100) score += 20;
    if (coverLetter.length > 200) score += 10;
    if (coverLetter.toLowerCase().includes('tajriba')) score += 10;
    if (coverLetter.toLowerCase().includes('ko\'nikma')) score += 10;

    score = Math.min(100, score);

    res.json({
      success: true,
      data: {
        proposal_id,
        score,
        feedback: score > 70 ? 'Yaxshi taklif' : 'Taklifni yaxshilash tavsiya etiladi'
      }
    });
  } catch (error) {
    console.error('Proposal score error:', error);
    res.status(500).json({
      success: false,
      message: 'Taklifni baholashda xato yuz berdi.',
      error: error.message
    });
  }
};

module.exports = {
  jobMatch,
  translate,
  generatePortfolio,
  proposalWriter,
  proposalScore
};

