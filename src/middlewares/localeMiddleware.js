// src/middlewares/localeMiddleware.js
// Middleware для локализации (uz, ru, en)

const supportedLocales = ['uz', 'ru', 'en'];
const defaultLocale = 'uz';

const localeMiddleware = (req, res, next) => {
  // Получаем язык из заголовка Accept-Language или query параметра
  let locale = defaultLocale;
  
  // Проверяем query параметр ?lang=uz
  if (req.query.lang && supportedLocales.includes(req.query.lang)) {
    locale = req.query.lang;
  }
  // Проверяем заголовок Accept-Language
  else if (req.headers['accept-language']) {
    const acceptLanguage = req.headers['accept-language'].toLowerCase();
    for (const supported of supportedLocales) {
      if (acceptLanguage.includes(supported)) {
        locale = supported;
        break;
      }
    }
  }
  
  req.locale = locale;
  next();
};

module.exports = localeMiddleware;

