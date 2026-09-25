"use client";

import Image from "next/image";
import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { saveBook, type AdminFormState } from "@/app/actions/admin-books";
import type { CategoryView } from "@/lib/types";

export type BookFormValues = {
  id?: number;
  sourceId: number;
  titleEn: string;
  titleAr: string;
  author: string;
  authorAr: string;
  cover: string;
  categoryId: number | null;
  priceSar: number;
  stock: number;
  isCd: boolean;
  active: boolean;
  descEn: string;
  descAr: string;
};

const initialState: AdminFormState = { status: "idle" };

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn btn-primary" disabled={pending}>
      {pending ? "جارٍ الحفظ…" : "حفظ"}
    </button>
  );
}

export function BookForm({ values, categories }: { values: BookFormValues; categories: CategoryView[] }) {
  const [state, formAction] = useActionState(saveBook, initialState);
  const err = (key: string) => state.fieldErrors?.[key];

  return (
    <form action={formAction} className="space-y-6">
      {values.id && <input type="hidden" name="id" value={values.id} />}

      <div className="grid gap-6 lg:grid-cols-[1fr_16rem]">
        <div className="space-y-4">
          <div className="card space-y-4 p-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label" htmlFor="titleEn">العنوان بالإنجليزية *</label>
                <input id="titleEn" name="titleEn" className="field latin" defaultValue={values.titleEn} dir="ltr" required />
                {err("titleEn") && <p className="mt-1 text-xs text-danger">مطلوب</p>}
              </div>
              <div>
                <label className="label" htmlFor="titleAr">العنوان بالعربية *</label>
                <input id="titleAr" name="titleAr" className="field" defaultValue={values.titleAr} required />
                {err("titleAr") && <p className="mt-1 text-xs text-danger">مطلوب</p>}
              </div>
              <div>
                <label className="label" htmlFor="author">المؤلف (إنجليزي)</label>
                <input id="author" name="author" className="field latin" defaultValue={values.author} dir="ltr" />
              </div>
              <div>
                <label className="label" htmlFor="authorAr">المؤلف (عربي)</label>
                <input id="authorAr" name="authorAr" className="field" defaultValue={values.authorAr} />
              </div>
            </div>
          </div>

          <div className="card space-y-4 p-5">
            <div>
              <label className="label" htmlFor="descEn">الوصف بالإنجليزية *</label>
              <textarea id="descEn" name="descEn" rows={4} className="field latin" defaultValue={values.descEn} dir="ltr" required />
              {err("descEn") && <p className="mt-1 text-xs text-danger">مطلوب</p>}
            </div>
            <div>
              <label className="label" htmlFor="descAr">الوصف بالعربية *</label>
              <textarea id="descAr" name="descAr" rows={4} className="field" defaultValue={values.descAr} required />
              {err("descAr") && <p className="mt-1 text-xs text-danger">مطلوب</p>}
            </div>
          </div>
        </div>

        <aside className="space-y-4">
          <div className="card p-5">
            <div className="relative mx-auto mb-4 aspect-square w-32 overflow-hidden rounded-lg bg-sunken">
              <Image src={values.cover || "/logo.jpg"} alt="" fill sizes="128px" className="object-cover" />
            </div>
            <div>
              <label className="label" htmlFor="cover">مسار الغلاف *</label>
              <input id="cover" name="cover" className="field latin text-xs" defaultValue={values.cover} dir="ltr" required placeholder="/covers/001-....png" />
            </div>
          </div>

          <div className="card space-y-4 p-5">
            <div>
              <label className="label" htmlFor="sourceId">رقم المصدر *</label>
              <input id="sourceId" name="sourceId" type="number" className="field" defaultValue={values.sourceId} required />
            </div>
            <div>
              <label className="label" htmlFor="categoryId">التصنيف</label>
              <select id="categoryId" name="categoryId" className="field" defaultValue={values.categoryId ?? ""}>
                <option value="">— بدون —</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.nameAr}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="priceSar">السعر (ريال سعودي) *</label>
              <input id="priceSar" name="priceSar" type="number" step="0.01" min="0" className="field" defaultValue={values.priceSar} dir="ltr" required />
            </div>
            <div>
              <label className="label" htmlFor="stock">المخزون *</label>
              <input id="stock" name="stock" type="number" min="0" className="field" defaultValue={values.stock} dir="ltr" required />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="isCd" defaultChecked={values.isCd} className="accent-[#8a5a24]" />
              <span>يحتوي على قرص CD</span>
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="active" defaultChecked={values.active} className="accent-[#8a5a24]" />
              <span>منشور في المتجر</span>
            </label>
          </div>
        </aside>
      </div>

      {state.status === "error" && state.message === "conflict" && (
        <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">
          تعذّر الحفظ — قد يكون رقم المصدر أو الرابط مستخدماً مسبقاً.
        </p>
      )}

      <div className="flex gap-2">
        <Submit />
        <Link href="/admin/books" className="btn btn-ghost">إلغاء</Link>
      </div>
    </form>
  );
}
