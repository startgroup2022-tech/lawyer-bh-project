import type { Locale } from "./i18n";

export type TermsSectionKey =
  | "acceptance" | "service-nature" | "privacy" | "data"
  | "location-notifications" | "sharing" | "payments" | "accounts"
  | "limitations" | "retention-rights" | "law" | "changes-contact";

export interface TermsContent {
  title: string;
  subtitle: string;
  lastUpdated: string;
  owner: string;
  back: string;
  sections: readonly { key: TermsSectionKey; heading: string; body: string }[];
}

const owner = "GULF INTERNATIONAL COLLECTION AND CONSULTING CO. W.L.L";

const content: Record<Locale, TermsContent> = {
  ar: {
    title: "الشروط والأحكام وسياسة الخصوصية",
    subtitle: "توضح هذه الوثيقة شروط استخدام LegalSOS وكيفية التعامل مع بياناتك.",
    lastUpdated: "آخر تحديث: 23 أغسطس 2026",
    owner,
    back: "العودة إلى الرئيسية",
    sections: [
      { key: "acceptance", heading: "قبول الشروط", body: "باستخدام موقع أو تطبيق LegalSOS أو إرسال طلب من خلالهما، فإنك توافق على هذه الشروط وسياسة الخصوصية. تشكل هذه الوثيقة اتفاقاً بينك وبين شركة GULF INTERNATIONAL COLLECTION AND CONSULTING CO. W.L.L، المالكة والمشغلة للخدمة." },
      { key: "service-nature", heading: "طبيعة الخدمة", body: "LegalSOS منصة وسيطة تساعد المستخدم على إرسال طلب قانوني والوصول إلى محامين أو مقدمي خدمات قانونية بحسب الدولة والتخصص والتوافر. LegalSOS ليست جهة حكومية أو شرطة أو إسعافاً أو دفاعاً مدنياً، ولا تستبدل خدمات الطوارئ الرسمية." },
      { key: "privacy", heading: "الخصوصية والأمان", body: "نتعامل مع البيانات الشخصية بالقدر اللازم لتشغيل الخدمة وحماية الحسابات ومتابعة الطلبات. نستخدم إجراءات تقنية وتنظيمية معقولة، لكن لا يمكن ضمان أمان الإرسال أو التخزين الإلكتروني بصورة مطلقة." },
      { key: "data", heading: "البيانات التي نجمعها واستخدامها", body: "قد نجمع الاسم وبيانات التواصل وبيانات الحساب ووصف الطلب والمرفقات وبيانات الجهاز وسجلات الاستخدام ومعلومات الدفع المرجعية. نستخدمها لإنشاء الطلب والتحقق من الحساب وتقديم الدعم ومنع الاحتيال وتحسين الخدمة والامتثال للالتزامات القانونية." },
      { key: "location-notifications", heading: "الموقع والإشعارات", body: "لا نصل إلى الموقع أو الإشعارات إلا بعد إذن الجهاز. يستخدم الموقع لتحديد الدولة أو ربط الطلب بالمكان والعثور على مقدم خدمة قريب عند الحاجة. تستخدم الإشعارات لإبلاغك بتحديثات الطلب، ويمكنك إيقاف الصلاحيات من إعدادات الجهاز." },
      { key: "sharing", heading: "مشاركة البيانات", body: "قد نشارك الحد الأدنى اللازم من بيانات الطلب مع المحامي أو مقدم الخدمة المكلّف، ومع مزودي الاستضافة والاتصالات والدفع والتحليلات الذين يساعدون في تشغيل LegalSOS. وقد نفصح عن بيانات عندما يفرض القانون ذلك أو لحماية الحقوق والسلامة." },
      { key: "payments", heading: "الدفع", body: "قد تتم المدفوعات من خلال مزود دفع خارجي. لا نعرض بيانات البطاقة الكاملة ولا نخزنها في أنظمة LegalSOS عندما يعالجها مزود الدفع مباشرة. تخضع المعاملة أيضاً لشروط وسياسة الخصوصية الخاصة بمزود الدفع." },
      { key: "accounts", heading: "الحسابات ومسؤولية المستخدم", body: "يجب تقديم معلومات صحيحة وحديثة والمحافظة على سرية بيانات الدخول. أنت مسؤول عن النشاط الذي يتم من حسابك وعن مشروعية ودقة المحتوى والمستندات التي ترسلها، ويجب إبلاغنا عند الاشتباه في استخدام غير مصرح به." },
      { key: "limitations", heading: "حدود مسؤولية المنصة", body: "لا تضمن LegalSOS قبول محامي للطلب أو زمن الوصول أو نتيجة الاستشارة أو القضية. العلاقة المهنية والخدمة القانونية الفعلية تكون مع مقدم الخدمة المختار أو المكلّف، ولا تتحمل المنصة مسؤولية الاتفاقات التي تتم خارج نطاقها." },
      { key: "retention-rights", heading: "الاحتفاظ بالبيانات وحقوقك", body: "نحتفظ بالبيانات للمدة اللازمة لتقديم الخدمة وتسوية المعاملات والوفاء بالمتطلبات القانونية وحماية الحقوق. يمكنك طلب الوصول إلى بياناتك أو تصحيحها أو حذفها عندما يسمح القانون بذلك عبر التواصل معنا." },
      { key: "law", heading: "القانون والاختصاص", body: "تخضع هذه الشروط لقوانين مملكة البحرين وتفسر وفقاً لها. تكون محاكم مملكة البحرين مختصة بالنزاعات الناشئة عن استخدام LegalSOS، ما لم يوجب قانون نافذ خلاف ذلك." },
      { key: "changes-contact", heading: "التعديلات والتواصل", body: "يجوز تحديث هذه الوثيقة عند تغير الخدمة أو المتطلبات القانونية، ويظهر تاريخ التحديث في أعلى الصفحة. للاستفسارات والطلبات المتعلقة بالخصوصية تواصل معنا عبر info@legalsos.org." },
    ],
  },
  en: {
    title: "Terms, Conditions and Privacy Policy",
    subtitle: "This document explains the terms of using LegalSOS and how we handle your data.",
    lastUpdated: "Last updated: August 23, 2026",
    owner,
    back: "Back to home",
    sections: [
      { key: "acceptance", heading: "Acceptance of terms", body: "By using the LegalSOS website or app, or submitting a request through either, you agree to these terms and this privacy policy. This document is an agreement between you and GULF INTERNATIONAL COLLECTION AND CONSULTING CO. W.L.L, the owner and operator of the service." },
      { key: "service-nature", heading: "Nature of the service", body: "LegalSOS is an intermediary platform that helps users submit legal requests and reach lawyers or legal service providers according to country, specialty and availability. LegalSOS is not a government, police, ambulance or civil-defence service and does not replace official emergency services." },
      { key: "privacy", heading: "Privacy and security", body: "We process personal data only as reasonably required to operate the service, protect accounts and manage requests. We apply reasonable technical and organisational safeguards, but no electronic transmission or storage method can be guaranteed absolutely secure." },
      { key: "data", heading: "Data we collect and why", body: "We may collect names, contact and account details, request descriptions, attachments, device and usage records, and payment references. We use this information to create requests, verify accounts, provide support, prevent fraud, improve the service and meet legal obligations." },
      { key: "location-notifications", heading: "Location and notifications", body: "We access location or notifications only after device permission. Location may identify the country, associate a request with a place or find a nearby provider. Notifications deliver request updates. You can disable either permission in your device settings." },
      { key: "sharing", heading: "Data sharing", body: "We may share the minimum request information needed with the assigned lawyer or provider and with hosting, communication, payment and analytics vendors that operate LegalSOS. We may also disclose information when required by law or to protect rights and safety." },
      { key: "payments", heading: "Payments", body: "Payments may be handled by an external payment provider. LegalSOS does not display or store full card details when the provider processes them directly. Transactions are also governed by the payment provider's terms and privacy practices." },
      { key: "accounts", heading: "Accounts and user responsibilities", body: "You must provide accurate, current information and keep credentials confidential. You are responsible for account activity and for the legality and accuracy of content and documents you submit. Notify us if you suspect unauthorised account use." },
      { key: "limitations", heading: "Platform limitations", body: "LegalSOS does not guarantee that a lawyer will accept a request, arrival time, advice, or the outcome of a matter. The professional relationship and legal service are with the selected or assigned provider. The platform is not responsible for agreements made outside it." },
      { key: "retention-rights", heading: "Retention and your rights", body: "We retain data as needed to deliver services, settle transactions, meet legal requirements and protect rights. You may request access, correction or deletion where permitted by law by contacting us." },
      { key: "law", heading: "Governing law", body: "These terms are governed by the laws of the Kingdom of Bahrain. Bahrain courts have jurisdiction over disputes arising from LegalSOS use unless applicable law requires otherwise." },
      { key: "changes-contact", heading: "Changes and contact", body: "We may update this document when the service or legal requirements change, and the date above will identify the latest version. For privacy questions or requests, contact info@legalsos.org." },
    ],
  },
  tr: {
    title: "Şartlar, Koşullar ve Gizlilik Politikası",
    subtitle: "Bu belge LegalSOS kullanım koşullarını ve verilerinizi nasıl işlediğimizi açıklar.",
    lastUpdated: "Son güncelleme: 23 Ağustos 2026",
    owner,
    back: "Ana sayfaya dön",
    sections: [
      { key: "acceptance", heading: "Koşulların kabulü", body: "LegalSOS web sitesini veya uygulamasını kullanarak ya da bir talep göndererek bu koşulları ve gizlilik politikasını kabul edersiniz. Bu belge, sizinle hizmetin sahibi ve işletmecisi GULF INTERNATIONAL COLLECTION AND CONSULTING CO. W.L.L arasındaki anlaşmadır." },
      { key: "service-nature", heading: "Hizmetin niteliği", body: "LegalSOS, kullanıcıların hukuki talep göndermesine ve ülke, uzmanlık ve müsaitliğe göre avukatlara veya hukuki hizmet sağlayıcılarına ulaşmasına yardımcı olan aracı bir platformdur. Resmî acil durum hizmetlerinin yerine geçmez." },
      { key: "privacy", heading: "Gizlilik ve güvenlik", body: "Kişisel verileri hizmeti işletmek, hesapları korumak ve talepleri yönetmek için makul ölçüde gerekli olduğu kadar işleriz. Makul teknik ve idari önlemler uygularız; ancak hiçbir elektronik iletim veya saklama yöntemi mutlak güvenlik sağlayamaz." },
      { key: "data", heading: "Topladığımız veriler ve amaçlar", body: "Ad, iletişim ve hesap bilgileri, talep açıklamaları, ekler, cihaz ve kullanım kayıtları ile ödeme referanslarını toplayabiliriz. Bunları talepleri oluşturmak, hesapları doğrulamak, destek vermek, dolandırıcılığı önlemek, hizmeti geliştirmek ve yasal yükümlülüklere uymak için kullanırız." },
      { key: "location-notifications", heading: "Konum ve bildirimler", body: "Konuma veya bildirimlere yalnızca cihaz izni sonrasında erişiriz. Konum ülkeyi belirlemek, talebi bir yerle ilişkilendirmek veya yakındaki sağlayıcıyı bulmak için kullanılabilir. Bildirimler talep güncellemelerini iletir; izinleri cihaz ayarlarından kapatabilirsiniz." },
      { key: "sharing", heading: "Veri paylaşımı", body: "Talep için gerekli asgari bilgileri görevlendirilen avukat veya sağlayıcıyla ve LegalSOS'u çalıştıran barındırma, iletişim, ödeme ve analiz hizmetleriyle paylaşabiliriz. Kanun gerektirdiğinde veya hak ve güvenliği korumak için de açıklama yapabiliriz." },
      { key: "payments", heading: "Ödemeler", body: "Ödemeler harici bir ödeme sağlayıcısı tarafından işlenebilir. Sağlayıcı kartı doğrudan işlerken LegalSOS tam kart bilgilerini görüntülemez veya saklamaz. İşlem, ödeme sağlayıcısının koşullarına ve gizlilik uygulamalarına da tabidir." },
      { key: "accounts", heading: "Hesaplar ve kullanıcı sorumluluğu", body: "Doğru ve güncel bilgi vermeli, giriş bilgilerinizi gizli tutmalısınız. Hesap etkinliğinden ve gönderdiğiniz içerik ile belgelerin hukuka uygunluğu ve doğruluğundan siz sorumlusunuz. Yetkisiz kullanım şüphesini bize bildirin." },
      { key: "limitations", heading: "Platform sınırlamaları", body: "LegalSOS bir avukatın talebi kabul edeceğini, varış süresini, tavsiyeyi veya hukuki sonucunuzu garanti etmez. Mesleki ilişki ve hukuki hizmet seçilen veya görevlendirilen sağlayıcıyla kurulur. Platform dışında yapılan anlaşmalardan LegalSOS sorumlu değildir." },
      { key: "retention-rights", heading: "Saklama ve haklarınız", body: "Verileri hizmet sunmak, işlemleri sonuçlandırmak, yasal gereklilikleri karşılamak ve hakları korumak için gereken süre boyunca saklarız. Kanunun izin verdiği ölçüde erişim, düzeltme veya silme talep edebilirsiniz." },
      { key: "law", heading: "Uygulanacak hukuk", body: "Bu koşullar Bahreyn Krallığı yasalarına tabidir. Uygulanabilir hukuk aksini gerektirmedikçe LegalSOS kullanımından doğan uyuşmazlıklarda Bahreyn mahkemeleri yetkilidir." },
      { key: "changes-contact", heading: "Değişiklikler ve iletişim", body: "Hizmet veya yasal gereklilikler değiştiğinde bu belgeyi güncelleyebiliriz; yukarıdaki tarih son sürümü gösterir. Gizlilik soruları ve talepleri için info@legalsos.org adresinden bize ulaşın." },
    ],
  },
};

export function getTermsContent(locale: Locale): TermsContent {
  return content[locale];
}
