---
name: "Telecom POS Arabic RTL"
description: "High-precision Right-to-Left (RTL) Arabic Point of Sale and Telecom Central management design system with Deep Navy navigation and Vibrant Royal Blue actions."
---

## Overview

A modern, high-clarity **Corporate / Modern** design system tailored for an Egyptian/Arab Telecom Central & Mobile Accessories Point of Sale (POS) management platform. The interface uses a strict **Right-to-Left (`dir="rtl"`)** layout engineered for rapid barcode scanning, zero-ambiguity financial figures, and crisp empty-state readiness.

- **Audience:** Telecom shop owners, cashiers, and inventory managers handling Vodafone Cash transfers, mobile devices, and accessories.
- **Personality:** Trustworthy, fast, disciplined, and uncluttered—combining authoritative Deep Navy (`#0F172A` / `#1E293B`) navigation chrome with Vibrant Royal Blue (`#2563EB` / `#3B82F6`) interactive focal points on a clean Slate White (`#F8FAFC`) workspace.

## Colors

The color system preserves the exact user-specified palette: Deep Navy Blue (`#0F172A` and `#1E293B`) for the persistent RTL sidebar and top scanner header, Vibrant Royal Blue (`#2563EB` and `#3B82F6`) for primary CTAs, active navigation states, and scanner focus rings, and a crisp light slate/white (`#F8FAFC` and `#FFFFFF`) for data tables, cards, and modals.

```yaml
colors:
  deep-navy: "#0F172A"
  navy-surface: "#1E293B"
  royal-blue: "#2563EB"
  royal-blue-bright: "#3B82F6"
  slate-canvas: "#F8FAFC"
  primary: "#2563EB"
  on-primary: "#FFFFFF"
  primary-container: "#EEF0FF"
  on-primary-container: "#002A78"
  secondary: "#0F172A"
  on-secondary: "#FFFFFF"
  secondary-container: "#1E293B"
  on-secondary-container: "#F8FAFC"
  surface: "#F8FAFC"
  on-surface: "#0F172A"
  surface-container-lowest: "#FFFFFF"
  surface-container-low: "#F1F5F9"
  surface-container: "#E2E8F0"
  on-surface-variant: "#475569"
  outline: "#CBD5E1"
  outline-variant: "#E2E8F0"
  success: "#047857"
  on-success: "#FFFFFF"
  success-container: "#ECFDF5"
  on-success-container: "#065F46"
  warning: "#B45309"
  on-warning: "#FFFFFF"
  warning-container: "#FFFBEB"
  on-warning-container: "#92400E"
  error: "#BA1A1A"
  on-error: "#FFFFFF"
  error-container: "#FFEDEA"
  on-error-container: "#93000A"
```

## Typography

**Cairo** serves as both the headline and body Arabic UI typeface for its balanced geometric proportions and crisp legibility in RTL tables and forms. **Source Code Pro** is paired for barcodes, IMEI numbers, phone numbers, and tabular financial figures (`tabular-nums`).

```yaml
typography:
  display-lg:
    fontFamily: "Cairo"
    fontSize: 36px
    fontWeight: 700
    lineHeight: 44px
    letterSpacing: -0.25px
  display-lg-mobile:
    fontFamily: "Cairo"
    fontSize: 28px
    fontWeight: 700
    lineHeight: 36px
    letterSpacing: 0px
  headline-lg:
    fontFamily: "Cairo"
    fontSize: 26px
    fontWeight: 700
    lineHeight: 34px
    letterSpacing: 0px
  headline-md:
    fontFamily: "Cairo"
    fontSize: 20px
    fontWeight: 700
    lineHeight: 28px
    letterSpacing: 0px
  headline-sm:
    fontFamily: "Cairo"
    fontSize: 18px
    fontWeight: 600
    lineHeight: 26px
    letterSpacing: 0px
  title-md:
    fontFamily: "Cairo"
    fontSize: 16px
    fontWeight: 600
    lineHeight: 24px
    letterSpacing: 0px
  body-md:
    fontFamily: "Cairo"
    fontSize: 14px
    fontWeight: 500
    lineHeight: 22px
    letterSpacing: 0px
  body-sm:
    fontFamily: "Cairo"
    fontSize: 13px
    fontWeight: 400
    lineHeight: 20px
    letterSpacing: 0px
  label-lg:
    fontFamily: "Cairo"
    fontSize: 14px
    fontWeight: 600
    lineHeight: 20px
    letterSpacing: 0px
  label-sm:
    fontFamily: "Cairo"
    fontSize: 12px
    fontWeight: 600
    lineHeight: 16px
    letterSpacing: 0px
  mono-md:
    fontFamily: "Source Code Pro"
    fontSize: 14px
    fontWeight: 600
    lineHeight: 20px
    letterSpacing: 0px
  mono-sm:
    fontFamily: "Source Code Pro"
    fontSize: 12px
    fontWeight: 500
    lineHeight: 16px
    letterSpacing: 0px
```

## Layout & Spacing

The application uses a **Fluid Desktop Workspace** with a fixed-width (`280px`) right-aligned RTL Deep Navy `<aside>` sidebar and a `flex-1` main content canvas (`#F8FAFC`). A persistent `sticky top-0` header houses the global **Barcode Scanner Input** (`إدخال / مسح الباركود`) across all screens. All spacing adheres to a strict `4px`/`8px` grid.

```yaml
spacing:
  gutter-xs: 4px
  gutter-sm: 8px
  gutter-md: 16px
  gutter-lg: 24px
  gutter-xl: 32px
  section: 32px
  page-margin: 24px
```

## Elevation & Depth

Cards, data tables, and POS panels rely on **crisp 1px `outline` borders** (`#CBD5E1` / `#E2E8F0`) on pure white (`#FFFFFF`) surfaces against the `#F8FAFC` canvas, avoiding heavy drop shadows. Subtle elevation is reserved exclusively for modal dialogs and dropdown menus.

## Shapes

Clean, structured corners communicate precision without feeling harsh: `8px` default for buttons and inputs, `12px` for cards and tables, and `16px` for modals.

```yaml
rounded:
  sm: 6px
  DEFAULT: 8px
  md: 12px
  lg: 16px
  xl: 20px
  full: 9999px
```

## Motion & Micro-interaction

Interactions are immediate and tactile so cashiers and operators get instant confirmation during barcode scans and modal actions.

```yaml
motion:
  state-change:
    duration: 120ms
    delay: 0ms
    timingFunction: ease-out
  surface-enter:
    duration: 200ms
    delay: 0ms
    timingFunction: cubic-bezier(0.2, 0, 0, 1)
  surface-exit:
    duration: 140ms
    delay: 0ms
    timingFunction: cubic-bezier(0.3, 0, 1, 1)
```

## Voice & Content Strategy

- **Language & Direction:** 100% Arabic UI (`dir="rtl"`), concise, operational terminology.
- **Empty State Discipline:** Every table, summary metric, and Vodafone Cash line starts at `0.00` or empty with a clear call-to-action (`+ إضافة جديد`) and ready-to-scan barcode input—never pre-filled with dummy items or fake transactions.
- **Action Labels:** Clear Arabic verb phrases (`+ إضافة جديد`, `تعديل`, `حذف`, `بيع سريع`, `تأكيد الحذف`, `تحويل / إرسال`, `استلام / سحب`).
- **Numeric Clarity:** All prices (`ج.م`), balances, quantities, IMEIs, and barcodes use `tabular-nums` and left-to-right numeric alignment where appropriate.

## Components

Component implementations live as individual HTML sticker sheet files in
`components/`. Each file contains the canonical, styled HTML components with
`<!-- COMPONENT: name -->` comment markers. Read each file before use.

- **Button** → `@components/button.html` — `button-primary`, `button-icon`, `button-with-icon`
- **Card** → `@components/card.html` — `card-elevated`, `card-action`, `card-interactive`, `card-interactive-2`
- **Input Field** → `@components/input-field.html` — `input-field-text`, `input-field-icon`
- **Modal** → `@components/modal.html` — `modal-standard`, `modal-alert`, `modal-drawer`
- **Table** → `@components/table.html` — `table-standard`, `table-interactive`, `table-selectable`
