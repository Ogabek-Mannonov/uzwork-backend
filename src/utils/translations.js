// src/utils/translations.js

const translations = {
  proposal_received: {
    title: {
      uz: "Yangi taklif!",
      en: "New proposal received!",
      ru: "Получено новое предложение!"
    },
    message: {
      uz: (data) => `"${data.jobTitle || 'loyiha'}" loyihangizga ${data.freelancerName || 'freelancer'} tomonidan yangi taklif keldi.`,
      en: (data) => `New proposal received for "${data.jobTitle || 'your project'}" from ${data.freelancerName || 'a freelancer'}.`,
      ru: (data) => `Получено новое предложение по проекту "${data.jobTitle || 'ваш проект'}" от ${data.freelancerName || 'фрилансера'}.`
    }
  },
  proposal_accepted: {
    title: {
      uz: "Taklif qabul qilindi!",
      en: "Proposal accepted!",
      ru: "Предложение принято!"
    },
    message: {
      uz: (data) => data.jobTitle ? `Sizning "${data.jobTitle}" loyihasi uchun yuborgan taklifingiz qabul qilindi.` : `Taklifingiz qabul qilindi. Tabriklaymiz!`,
      en: (data) => data.jobTitle ? `Your proposal for "${data.jobTitle}" has been accepted.` : `Your proposal has been accepted. Congratulations!`,
      ru: (data) => data.jobTitle ? `Ваше предложение по проекту "${data.jobTitle}" было принято.` : `Ваше предложение принято. Поздравляем!`
    }
  },
  payment_received: {
    title: {
      uz: "To'lov qabul qilindi",
      en: "Payment received",
      ru: "Платеж получен"
    },
    message: {
      uz: (data) => `${data.amount || ''} miqdoridagi mablag' hisobingizga kelib tushdi.`,
      en: (data) => `You received a payment of ${data.amount || ''}.`,
      ru: (data) => `Вы получили платеж в размере ${data.amount || ''}.`
    }
  },
  message_received: {
    title: {
      uz: "Yangi xabar",
      en: "New message",
      ru: "Новое сообщение"
    },
    message: {
      uz: (data) => data.senderName ? `${data.senderName} dan yangi xabar keldi.` : `Yangi xabar keldi.`,
      en: (data) => data.senderName ? `New message from ${data.senderName}.` : `You have a new message.`,
      ru: (data) => data.senderName ? `Новое сообщение от ${data.senderName}.` : `У вас новое сообщение.`
    }
  },
  withdrawal_request: {
    title: {
      uz: "Yechib olish so'rovi",
      en: "Withdrawal request",
      ru: "Запрос на вывод"
    },
    message: {
      uz: (data) => `${data.amount || ''} miqdoridagi mablag'ni yechib olish uchun so'rovingiz qabul qilindi.`,
      en: (data) => `Your request to withdraw ${data.amount || ''} has been received.`,
      ru: (data) => `Ваш запрос на вывод ${data.amount || ''} был принят.`
    }
  },
  escrow_hold: {
    title: {
      uz: "Mablag' band qilindi",
      en: "Funds held in escrow",
      ru: "Средства заблокированы"
    },
    message: {
      uz: (data) => `${data.amount || ''} miqdoridagi mablag' shartnoma uchun band qilindi.`,
      en: (data) => `${data.amount || ''} has been held in escrow for the contract.`,
      ru: (data) => `Средства в размере ${data.amount || ''} были заблокированы для контракта.`
    }
  },
  payment_sent: {
    title: {
      uz: "To'lov o'tkazildi",
      en: "Payment sent",
      ru: "Платеж отправлен"
    },
    message: {
      uz: (data) => `Freelancerga ${data.amount || ''} miqdoridagi to'lov muvaffaqiyatli o'tkazildi.`,
      en: (data) => `Payment of ${data.amount || ''} has been successfully sent to the freelancer.`,
      ru: (data) => `Платеж в размере ${data.amount || ''} был успешно отправлен фрилансеру.`
    }
  },
  contract_updated: {
    title: {
      uz: "Shartnoma yangilandi",
      en: "Contract updated",
      ru: "Контракт обновлен"
    },
    message: {
      uz: (data) => `Shartnoma holati yangilandi${data.status ? ': ' + data.status : ''}.`,
      en: (data) => `The contract status has been updated${data.status ? ': ' + data.status : ''}.`,
      ru: (data) => `Статус контракта был обновлен${data.status ? ': ' + data.status : ''}.`
    }
  },
  contract_completed: {
    title: {
      uz: "Shartnoma yakunlandi!",
      en: "Contract completed!",
      ru: "Контракт завершен!"
    },
    message: {
      uz: (data) => data.jobTitle ? `"${data.jobTitle}" shartnomasi mijoz tomonidan yakunlandi va mablag' balansingizga o'tkazildi.` : `Shartnoma yakunlandi va mablag' balansingizga o'tkazildi.`,
      en: (data) => data.jobTitle ? `The contract for "${data.jobTitle}" has been completed by the client and funds have been released to your balance.` : `The contract has been completed and funds have been released to your balance.`,
      ru: (data) => data.jobTitle ? `Контракт по проекту "${data.jobTitle}" был завершен клиентом, и средства были переведены на ваш баланс.` : `Контракт завершен, и средства переведены на ваш баланс.`
    }
  },
  contract_cancelled: {
    title: {
      uz: "Shartnoma bekor qilindi",
      en: "Contract cancelled",
      ru: "Контракт отменен"
    },
    message: {
      uz: (data) => data.jobTitle ? `"${data.jobTitle}" shartnomasi bekor qilindi.` : `Shartnomangiz bekor qilindi.`,
      en: (data) => data.jobTitle ? `The contract for "${data.jobTitle}" has been cancelled.` : `Your contract has been cancelled.`,
      ru: (data) => data.jobTitle ? `Контракт по проекту "${data.jobTitle}" был отменен.` : `Ваш контракт был отменен.`
    }
  },
  contract_started: {
    title: {
      uz: "Shartnoma boshlandi!",
      en: "Contract started!",
      ru: "Контракт начат!"
    },
    message: {
      uz: (data) => data.jobTitle ? `"${data.jobTitle}" loyihasi bo'yicha shartnoma imzolandi.` : `Yangi shartnoma imzolandi. Tabriklaymiz!`,
      en: (data) => data.jobTitle ? `A contract has been started for the project "${data.jobTitle}".` : `A new contract has been started. Congratulations!`,
      ru: (data) => data.jobTitle ? `Контракт по проекту "${data.jobTitle}" был запущен.` : `Новый контракт был запущен. Поздравляем!`
    }
  },
  proposal_rejected: {
    title: {
      uz: "Taklif rad etildi",
      en: "Proposal rejected",
      ru: "Предложение отклонено"
    },
    message: {
      uz: (data) => data.jobTitle ? `"${data.jobTitle}" loyihasiga yuborgan taklifingiz rad etildi.` : `Taklifingiz rad etildi. Boshqa loyihalarni ko'rib chiqing.`,
      en: (data) => data.jobTitle ? `Your proposal for "${data.jobTitle}" has been rejected.` : `Your proposal has been rejected. Please check other projects.`,
      ru: (data) => data.jobTitle ? `Ваше предложение по проекту "${data.jobTitle}" было отклонено.` : `Ваше предложение было отклонено. Посмотрите другие проекты.`
    }
  },
  job_invitation: {
    title: {
      uz: "Yangi ish taklifi!",
      en: "New job invitation!",
      ru: "Новое приглашение на работу!"
    },
    message: {
      uz: (data) => data.jobTitle ? `${data.clientName || 'Mijoz'} sizni "${data.jobTitle}" loyihasiga taklif qildi.` : `Sizga yangi ish taklifi keldi.`,
      en: (data) => data.jobTitle ? `${data.clientName || 'A client'} invited you to the project "${data.jobTitle}".` : `You have received a new job invitation.`,
      ru: (data) => data.jobTitle ? `${data.clientName || 'Клиент'} пригласил вас в проект "${data.jobTitle}".` : `Вы получили новое приглашение на работу.`
    }
  },
  invoice_ready: {
    title: {
      uz: "Hisob-faktura tayyor",
      en: "Invoice ready",
      ru: "Счет готов"
    },
    message: {
      uz: (data) => data.jobTitle ? `"${data.jobTitle}" loyihasi uchun yangi hisob-faktura tayyor.` : `Yangi hisob-faktura tayyor.`,
      en: (data) => data.jobTitle ? `A new invoice is ready for the project "${data.jobTitle}".` : `A new invoice is ready.`,
      ru: (data) => data.jobTitle ? `Новый счет готов для проекта "${data.jobTitle}".` : `Новый счет готов.`
    }
  },
  proposal_withdrawn: {
    title: {
      uz: "Taklif qaytib olindi",
      en: "Proposal withdrawn",
      ru: "Предложение отозвано"
    },
    message: {
      uz: (data) => data.jobTitle ? `"${data.jobTitle}" loyihasidan ${data.freelancerName || 'freelancer'} o'z taklifini qaytib oldi.` : `Taklif qaytib olindi.`,
      en: (data) => data.jobTitle ? `${data.freelancerName || 'A freelancer'} has withdrawn their proposal for "${data.jobTitle}".` : `A proposal has been withdrawn.`,
      ru: (data) => data.jobTitle ? `${data.freelancerName || 'Фрилансер'} отозвал свое предложение по "${data.jobTitle}".` : `Предложение было отозвано.`
    }
  },
  new_job_posted: {
    title: {
      uz: "Yangi loyiha!",
      en: "New job posted!",
      ru: "Новая вакансия!"
    },
    message: {
      uz: (data) => data.jobTitle ? `Sizning ko'nikmalaringizga mos keladigan yangi loyiha joylandi: "${data.jobTitle}"` : `Sizning ko'nikmalaringizga mos yangi loyiha joylandi.`,
      en: (data) => data.jobTitle ? `A new job matching your skills has been posted: "${data.jobTitle}"` : `A new job matching your skills has been posted.`,
      ru: (data) => data.jobTitle ? `Размещена новая вакансия, соответствующая вашим навыкам: "${data.jobTitle}"` : `Размещена новая вакансия, соответствующая вашим навыкам.`
    }
  },
  milestone_submitted: {
    title: {
      uz: "Bosqich topshirildi",
      en: "Milestone submitted",
      ru: "Этап выполнен"
    },
    message: {
      uz: (data) => `Freelancer ishni topshirdi va to'lovni yechishni so'radi${data.milestoneName ? ': "' + data.milestoneName + '"' : ''}.`,
      en: (data) => `The freelancer has submitted work and requested payment${data.milestoneName ? ': "' + data.milestoneName + '"' : ''}. Please review.`,
      ru: (data) => `Фрилансер выполнил работу и запрашивает оплату${data.milestoneName ? ': "' + data.milestoneName + '"' : ''}. Пожалуйста, проверьте.`
    }
  },
  milestone_approved: {
    title: {
      uz: "Bosqich tasdiqlandi!",
      en: "Milestone approved!",
      ru: "Этап одобрен!"
    },
    message: {
      uz: (data) => `Bosqich mijoz tomonidan tasdiqlandi${data.milestoneName ? ': "' + data.milestoneName + '"' : ''}.`,
      en: (data) => `Milestone has been approved by the client${data.milestoneName ? ': "' + data.milestoneName + '"' : ''}.`,
      ru: (data) => `Этап одобрен клиентом${data.milestoneName ? ': "' + data.milestoneName + '"' : ''}.`
    }
  },
  dispute_opened: {
    title: {
      uz: "Nizo ochildi",
      en: "Dispute opened",
      ru: "Открыт спор"
    },
    message: {
      uz: (data) => data.jobTitle ? `"${data.jobTitle}" loyihasi bo'yicha nizo ochildi.` : `Loyihangiz bo'yicha nizo ochildi.`,
      en: (data) => data.jobTitle ? `A dispute has been opened for the project "${data.jobTitle}".` : `A dispute has been opened for your project.`,
      ru: (data) => data.jobTitle ? `По проекту "${data.jobTitle}" открыт спор.` : `По вашему проекту открыт спор.`
    }
  },
  dispute_resolved: {
    title: {
      uz: "Nizo hal qilindi!",
      en: "Dispute resolved!",
      ru: "Спор разрешен!"
    },
    message: {
      uz: (data) => data.jobTitle ? `"${data.jobTitle}" loyihasidagi nizo muvaffaqiyatli hal qilindi.` : `Nizongiz muvaffaqiyatli hal qilindi.`,
      en: (data) => data.jobTitle ? `The dispute for the project "${data.jobTitle}" has been successfully resolved.` : `Your dispute has been successfully resolved.`,
      ru: (data) => data.jobTitle ? `Спор по проекту "${data.jobTitle}" успешно разрешен.` : `Ваш спор успешно разрешен.`
    }
  },
  new_review: {
    title: {
      uz: "Yangi sharh!",
      en: "New review!",
      ru: "Новый отзыв!"
    },
    message: {
      uz: (data) => data.reviewerName ? `${data.reviewerName} sharh qoldirdi.` : `Sizga yangi sharh qoldirildi.`,
      en: (data) => data.reviewerName ? `${data.reviewerName} left you a review.` : `You have received a new review.`,
      ru: (data) => data.reviewerName ? `${data.reviewerName} оставил вам отзыв.` : `Вам оставили новый отзыв.`
    }
  },
  verification_status: {
    title: {
      uz: "Tasdiqlash holati",
      en: "Verification status",
      ru: "Статус верификации"
    },
    message: {
      uz: (data) => data.isVerified 
        ? "Sizning shaxsingiz muvaffaqiyatli tasdiqlandi. Endi siz ko'proq imkoniyatlarga egasiz."
        : "Afsuski, yuborgan hujjatlaringiz talabga javob bermadi. Iltimos, qaytadan urinib ko'ring.",
      en: (data) => data.isVerified
        ? "Your identity has been successfully verified. You now have more opportunities."
        : "Unfortunately, the documents you submitted did not meet the requirements. Please try again.",
      ru: (data) => data.isVerified
        ? "Ваша личность была успешно подтверждена. Теперь у вас больше возможностей."
        : "К сожалению, представленные вами документы не соответствуют требованиям. Пожалуйста, попробуйте еще раз."
    }
  },
  milestone_rejected: {
    title: {
      uz: "Ish qabul qilinmadi",
      en: "Milestone rejected",
      ru: "Этап отклонен"
    },
    message: {
      uz: (data) => `Mijoz ishni rad etdi va tuzatish so'radi. Sabab: ${data.reason || 'Ko\'rsatilmadi'}`,
      en: (data) => `The client has rejected the work and requested revisions. Reason: ${data.reason || 'Not specified'}`,
      ru: (data) => `Клиент отклонил работу и запросил доработку. Причина: ${data.reason || 'Не указана'}`
    }
  },
  security_update: {
    title: {
      uz: "Xavfsizlik bildirishnomasi",
      en: "Security notification",
      ru: "Уведомление о безопасности"
    },
    message: {
      uz: (data) => data.message || "Hisobingiz xavfsizlik sozlamalarida o'zgarish sodir bo'ldi.",
      en: (data) => data.message_en || "Changes have been made to your account security settings.",
      ru: (data) => data.message_ru || "В настройки безопасности вашего аккаунта были внесены изменения."
    }
  },
  email_updated: {
    title: {
      uz: "Email o'zgartirildi",
      en: "Email updated",
      ru: "Email изменен"
    },
    message: {
      uz: "Hisobingizdagi email manzili yangilandi. Agar bu siz bo'lmasangiz, darhol parolni almashtiring.",
      en: "The email address on your account has been updated. If this was not you, please change your password immediately.",
      ru: "Адрес электронной почты в вашей учетной записи был обновлен. Если это были не вы, немедленно смените пароль."
    }
  },
  phone_updated: {
    title: {
      uz: "Telefon raqami o'zgartirildi",
      en: "Phone number updated",
      ru: "Номер телефона изменен"
    },
    message: {
      uz: "Hisobingizdagi telefon raqami yangilandi.",
      en: "The phone number on your account has been updated.",
      ru: "Номер телефона в вашей учетной записи был обновлен."
    }
  },
  password_updated: {
    title: {
      uz: "Parol o'zgartirildi",
      en: "Password changed",
      ru: "Пароль изменен"
    },
    message: {
      uz: "Hisobingizdagi parol muvaffaqiyatli yangilandi.",
      en: "Your account password has been successfully updated.",
      ru: "Пароль вашей учетной записи был успешно обновлен."
    }
  }
};

/**
 * Get translated strings for a notification type
 * @param {string} type 
 * @param {object} data 
 * @returns {object} { title_uz, title_en, title_ru, body_uz, body_en, body_ru }
 */
const getNotificationTranslations = (type, data = {}) => {
  const trans = translations[type];
  if (!trans) return null;

  return {
    title_uz: trans.title.uz,
    title_en: trans.title.en,
    title_ru: trans.title.ru,
    body_uz: typeof trans.message.uz === 'function' ? trans.message.uz(data) : trans.message.uz,
    body_en: typeof trans.message.en === 'function' ? trans.message.en(data) : trans.message.en,
    body_ru: typeof trans.message.ru === 'function' ? trans.message.ru(data) : trans.message.ru,
  };
};

module.exports = { getNotificationTranslations };
