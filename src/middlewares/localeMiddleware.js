// src/middlewares/localeMiddleware.js
const supportedLocales = ["uz", "ru", "en"];
const defaultLocale = "uz";

const localeMiddleware = (req, res, next) => {
  let locale = defaultLocale;

  if (req.query.lang && supportedLocales.includes(req.query.lang)) {
    locale = req.query.lang;
  } else if (req.headers["accept-language"]) {
    const al = req.headers["accept-language"].toLowerCase();
    const found = supportedLocales.find((x) => al.includes(x));
    if (found) locale = found;
  }

  req.locale = locale;
  next();
};

module.exports = localeMiddleware;
