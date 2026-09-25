import { changeAdminPassword, saveSettings } from "@/app/actions/admin-settings";
import { requireAdmin } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { CURRENCIES } from "@/lib/types";

function fieldProps(value: string | null | undefined, extra = "") {
  return { defaultValue: value ?? "", className: `field ${extra}` };
}

export default async function AdminSettingsPage({ searchParams }: PageProps<"/admin/settings">) {
  const admin = await requireAdmin();
  const s = await getSettings();
  const sp = await searchParams;
  const get = (k: string) => (Array.isArray(sp[k]) ? sp[k][0] : sp[k]) as string | undefined;

  const errors: Record<string, string> = {
    rates: "أسعار الصرف يجب أن تكون أرقاماً موجبة.",
    price: "السعر الافتراضي غير صالح.",
    shipping: "رسوم الشحن غير صالحة.",
    currency: "العملة الافتراضية غير صالحة.",
    password: "كلمة المرور الجديدة غير صالحة (8 أحرف على الأقل ومطابقة للتأكيد).",
    current: "كلمة المرور الحالية غير صحيحة.",
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold sm:text-3xl">الإعدادات</h1>
        <p className="mt-1 text-sm text-muted">تُطبَّق التغييرات على المتجر مباشرة بعد الحفظ.</p>
      </header>

      {get("saved") && <p className="rounded-lg bg-ok-soft px-3 py-2 text-sm text-ok">تم حفظ الإعدادات.</p>}
      {get("password") && <p className="rounded-lg bg-ok-soft px-3 py-2 text-sm text-ok">تم تغيير كلمة المرور.</p>}
      {get("error") && (
        <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">
          {errors[get("error")!] ?? "حدث خطأ."}
        </p>
      )}

      <form action={saveSettings} className="space-y-6">
        <section className="card space-y-4 p-5">
          <h2 className="font-bold">هوية المتجر</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="storeNameAr">اسم المتجر (عربي)</label>
              <input id="storeNameAr" name="storeNameAr" {...fieldProps(s.storeNameAr)} />
            </div>
            <div>
              <label className="label" htmlFor="storeNameEn">اسم المتجر (إنجليزي)</label>
              <input id="storeNameEn" name="storeNameEn" {...fieldProps(s.storeNameEn, "latin")} dir="ltr" />
            </div>
            <div>
              <label className="label" htmlFor="taglineAr">الوصف المختصر (عربي)</label>
              <input id="taglineAr" name="taglineAr" {...fieldProps(s.taglineAr)} />
            </div>
            <div>
              <label className="label" htmlFor="taglineEn">الوصف المختصر (إنجليزي)</label>
              <input id="taglineEn" name="taglineEn" {...fieldProps(s.taglineEn, "latin")} dir="ltr" />
            </div>
          </div>
        </section>

        <section className="card space-y-4 p-5">
          <h2 className="font-bold">الأسعار والعملات</h2>
          <p className="-mt-2 text-xs text-muted">كل الأسعار تُخزَّن بالريال السعودي، وتُحوَّل للعرض فقط.</p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="label" htmlFor="usdPerSar">١ دولار = كم ريال</label>
              <input id="usdPerSar" name="usdPerSar" type="number" step="0.01" min="0.01" defaultValue={s.usdPerSar} className="field" dir="ltr" required />
            </div>
            <div>
              <label className="label" htmlFor="sypPerSar">١ ليرة سورية = كم ريال</label>
              <input id="sypPerSar" name="sypPerSar" type="number" step="0.01" min="0.01" defaultValue={s.sypPerSar} className="field" dir="ltr" required />
            </div>
            <div>
              <label className="label" htmlFor="defaultPriceSar">السعر الافتراضي للكتاب (ريال)</label>
              <input id="defaultPriceSar" name="defaultPriceSar" type="number" step="0.01" min="0" defaultValue={s.defaultPriceCents / 100} className="field" dir="ltr" required />
            </div>
            <div>
              <label className="label" htmlFor="currencyDefault">العملة الافتراضية</label>
              <select id="currencyDefault" name="currencyDefault" className="field" defaultValue={s.currencyDefault}>
                {CURRENCIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>
        </section>

        <section className="card space-y-4 p-5">
          <h2 className="font-bold">الشحن</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="label" htmlFor="shippingFlatSar">رسوم الشحن الثابتة (ريال)</label>
              <input id="shippingFlatSar" name="shippingFlatSar" type="number" step="0.01" min="0" defaultValue={s.shippingFlatCents / 100} className="field" dir="ltr" required />
            </div>
            <div>
              <label className="label" htmlFor="freeCountries">دول الشحن المجاني</label>
              <input id="freeCountries" name="freeCountries" defaultValue={s.freeCountries.join(", ")} className="field latin" dir="ltr" placeholder="SY, SA" />
              <p className="mt-1 text-[11px] text-muted">رموز ISO، مفصولة بفاصلة.</p>
            </div>
            <div>
              <label className="label" htmlFor="freeCities">مدن الشحن المجاني</label>
              <input id="freeCities" name="freeCities" defaultValue={s.freeCities.join(", ")} className="field" placeholder="الرياض, Riyadh" />
              <p className="mt-1 text-[11px] text-muted">تُطابق بعد تجاهل حالة الأحرف والمسافات.</p>
            </div>
          </div>
        </section>

        <section className="card space-y-4 p-5">
          <h2 className="font-bold">التواصل</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="contactPhone">الهاتف</label>
              <input id="contactPhone" name="contactPhone" {...fieldProps(s.contactPhone, "latin")} dir="ltr" />
            </div>
            <div>
              <label className="label" htmlFor="contactWhatsapp">واتساب</label>
              <input id="contactWhatsapp" name="contactWhatsapp" {...fieldProps(s.contactWhatsapp, "latin")} dir="ltr" placeholder="+963…" />
            </div>
            <div>
              <label className="label" htmlFor="contactEmail">البريد الإلكتروني</label>
              <input id="contactEmail" name="contactEmail" type="email" {...fieldProps(s.contactEmail, "latin")} dir="ltr" />
            </div>
            <div>
              <label className="label" htmlFor="siteUrl">رابط الموقع</label>
              <input id="siteUrl" name="siteUrl" {...fieldProps(s.siteUrl, "latin")} dir="ltr" placeholder="https://" />
            </div>
            <div>
              <label className="label" htmlFor="contactAddressAr">العنوان (عربي)</label>
              <input id="contactAddressAr" name="contactAddressAr" {...fieldProps(s.contactAddressAr)} />
            </div>
            <div>
              <label className="label" htmlFor="contactAddressEn">العنوان (إنجليزي)</label>
              <input id="contactAddressEn" name="contactAddressEn" {...fieldProps(s.contactAddressEn, "latin")} dir="ltr" />
            </div>
          </div>
        </section>

        <section className="card space-y-4 p-5">
          <h2 className="font-bold">بيانات التحويل البنكي</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="label" htmlFor="bankName">اسم البنك</label>
              <input id="bankName" name="bankName" {...fieldProps(s.bankName)} />
            </div>
            <div>
              <label className="label" htmlFor="bankAccountName">اسم صاحب الحساب</label>
              <input id="bankAccountName" name="bankAccountName" {...fieldProps(s.bankAccountName)} />
            </div>
            <div>
              <label className="label" htmlFor="bankIban">الآيبان / رقم الحساب</label>
              <input id="bankIban" name="bankIban" {...fieldProps(s.bankIban, "latin")} dir="ltr" />
            </div>
          </div>
        </section>

        <section className="card space-y-4 p-5">
          <h2 className="font-bold">التواصل الاجتماعي و SEO</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className="label" htmlFor="instagramUrl">Instagram</label>
              <input id="instagramUrl" name="instagramUrl" {...fieldProps(s.instagramUrl, "latin")} dir="ltr" />
            </div>
            <div>
              <label className="label" htmlFor="facebookUrl">Facebook</label>
              <input id="facebookUrl" name="facebookUrl" {...fieldProps(s.facebookUrl, "latin")} dir="ltr" />
            </div>
            <div>
              <label className="label" htmlFor="telegramUrl">Telegram</label>
              <input id="telegramUrl" name="telegramUrl" {...fieldProps(s.telegramUrl, "latin")} dir="ltr" />
            </div>
            <div>
              <label className="label" htmlFor="seoTitleAr">عنوان SEO (عربي)</label>
              <input id="seoTitleAr" name="seoTitleAr" {...fieldProps(s.seoTitleAr)} />
            </div>
            <div>
              <label className="label" htmlFor="seoTitleEn">عنوان SEO (إنجليزي)</label>
              <input id="seoTitleEn" name="seoTitleEn" {...fieldProps(s.seoTitleEn, "latin")} dir="ltr" />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="seoDescAr">وصف SEO (عربي)</label>
              <textarea id="seoDescAr" name="seoDescAr" rows={3} className="field" defaultValue={s.seoDescAr ?? ""} />
            </div>
            <div>
              <label className="label" htmlFor="seoDescEn">وصف SEO (إنجليزي)</label>
              <textarea id="seoDescEn" name="seoDescEn" rows={3} className="field latin" dir="ltr" defaultValue={s.seoDescEn ?? ""} />
            </div>
          </div>
        </section>

        <div className="sticky bottom-4 z-10">
          <button type="submit" className="btn btn-primary shadow-lift">حفظ الإعدادات</button>
        </div>
      </form>

      <section className="card space-y-4 p-5">
        <h2 className="font-bold">تغيير كلمة المرور</h2>
        <p className="text-xs text-muted" dir="ltr">{admin.email}</p>
        <form action={changeAdminPassword} className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="label" htmlFor="current">كلمة المرور الحالية</label>
            <input id="current" name="current" type="password" className="field latin" dir="ltr" required autoComplete="current-password" />
          </div>
          <div>
            <label className="label" htmlFor="next">الجديدة (8 أحرف على الأقل)</label>
            <input id="next" name="next" type="password" className="field latin" dir="ltr" required autoComplete="new-password" />
          </div>
          <div>
            <label className="label" htmlFor="confirm">تأكيد الجديدة</label>
            <input id="confirm" name="confirm" type="password" className="field latin" dir="ltr" required autoComplete="new-password" />
          </div>
          <div className="sm:col-span-3">
            <button type="submit" className="btn btn-outline">تغيير كلمة المرور</button>
          </div>
        </form>
      </section>
    </div>
  );
}
