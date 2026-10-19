import { theme } from 'antd';
import { brandTokens, lightSemanticTokens, darkSemanticTokens } from './tokens.js';

export function getAntdTheme(isDarkMode = false) {
  const semantic = isDarkMode ? darkSemanticTokens : lightSemanticTokens;

  return {
    algorithm: isDarkMode ? theme.darkAlgorithm : theme.defaultAlgorithm,
    token: {
      colorPrimary: isDarkMode ? brandTokens.teal : brandTokens.navy,
      colorInfo: brandTokens.teal,
      colorSuccess: brandTokens.success,
      colorWarning: brandTokens.amber,
      colorError: brandTokens.error,
      colorTextBase: semantic.textPrimary,
      colorBgBase: semantic.bgSurface,
      borderRadius: 8,
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
      controlHeight: 40,
      fontSize: 14,
    },
    components: {
      Button: {
        controlHeight: 40,
        colorPrimary: isDarkMode ? brandTokens.teal : brandTokens.navy,
        colorPrimaryHover: isDarkMode ? brandTokens.tealLight : brandTokens.navySoft,
        borderRadius: 8,
        fontWeight: 600,
      },
      Input: {
        controlHeight: 40,
        colorBorder: semantic.borderDefault,
        borderRadius: 8,
        activeBorderColor: isDarkMode ? brandTokens.teal : brandTokens.navy,
        hoverBorderColor: isDarkMode ? brandTokens.teal : brandTokens.navySoft,
        activeShadow: isDarkMode ? '0 0 0 2px rgba(79, 168, 192, 0.25)' : '0 0 0 2px rgba(22, 49, 63, 0.12)',
        paddingInline: 14,
      },
      Select: {
        controlHeight: 40,
        colorBorder: semantic.borderDefault,
        borderRadius: 8,
        colorPrimary: isDarkMode ? brandTokens.teal : brandTokens.navy,
        colorPrimaryHover: isDarkMode ? brandTokens.teal : brandTokens.navySoft,
        controlOutline: isDarkMode ? 'rgba(79, 168, 192, 0.25)' : 'rgba(22, 49, 63, 0.12)',
        optionSelectedBg: isDarkMode ? 'rgba(79, 168, 192, 0.2)' : 'rgba(79, 168, 192, 0.12)',
        optionSelectedColor: isDarkMode ? '#ffffff' : brandTokens.navy,
        multipleItemBg: isDarkMode ? 'rgba(79, 168, 192, 0.18)' : 'rgba(79, 168, 192, 0.12)',
        multipleItemBorderColor: isDarkMode ? 'rgba(79, 168, 192, 0.35)' : 'rgba(79, 168, 192, 0.25)',
      },
      InputNumber: {
        controlHeight: 40,
        colorBorder: semantic.borderDefault,
        borderRadius: 8,
        activeBorderColor: isDarkMode ? brandTokens.teal : brandTokens.navy,
        hoverBorderColor: isDarkMode ? brandTokens.teal : brandTokens.navySoft,
      },
      DatePicker: {
        controlHeight: 40,
        colorBorder: semantic.borderDefault,
        borderRadius: 8,
        activeBorderColor: isDarkMode ? brandTokens.teal : brandTokens.navy,
        hoverBorderColor: isDarkMode ? brandTokens.teal : brandTokens.navySoft,
      },
      Form: {
        itemMarginBottom: 20,
        verticalLabelPadding: '0 0 6px',
        labelFontSize: 13,
        labelColor: semantic.textPrimary,
      },
      Steps: {
        colorPrimary: isDarkMode ? brandTokens.teal : brandTokens.navy,
      },
      Radio: {
        colorPrimary: isDarkMode ? brandTokens.teal : brandTokens.navy,
        buttonSolidCheckedBg: isDarkMode ? brandTokens.teal : brandTokens.navy,
        buttonSolidCheckedHoverBg: isDarkMode ? brandTokens.tealLight : brandTokens.navySoft,
      },
      Checkbox: {
        colorPrimary: isDarkMode ? brandTokens.teal : brandTokens.navy,
        borderRadiusSM: 4,
      },
      Switch: {
        colorPrimary: isDarkMode ? brandTokens.teal : brandTokens.navy,
        colorPrimaryHover: isDarkMode ? brandTokens.tealLight : brandTokens.navySoft,
      },
      Card: {
        colorBgContainer: semantic.bgCard,
        colorBorderSecondary: semantic.borderDefault,
        borderRadiusLG: 12,
        boxShadowCard: semantic.boxShadow,
      },
      Layout: {
        bodyBg: semantic.bgApp,
        headerBg: semantic.bgSurface,
        siderBg: isDarkMode ? '#0d1820' : '#ffffff',
      },
      Menu: {
        itemBg: 'transparent',
        itemColor: isDarkMode ? '#94a3b8' : '#475569',
        itemSelectedColor: isDarkMode ? '#ffffff' : brandTokens.navy,
        itemSelectedBg: isDarkMode ? 'rgba(79, 168, 192, 0.2)' : 'rgba(79, 168, 192, 0.12)',
        itemHoverColor: isDarkMode ? '#ffffff' : brandTokens.navy,
        itemHoverBg: isDarkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(79, 168, 192, 0.06)',
        subMenuItemBg: 'transparent',
        borderRadius: 8,
        fontSize: 13,
      },
      Typography: {
        colorTextHeading: semantic.textPrimary,
      },
    },
  };
}
