import { useRef, useState } from "react";
import { TextInput } from "react-native";
import { formatMoney } from "../utils/format";

// Drop-in replacement for TextInput on numeric fields: shows a pretty "1.234,56" at
// rest, switches to the raw editable string on focus with the cursor placed at the
// end (formatted commas otherwise make the cursor jump to the start while typing).
export default function AmountInput({ value, onChangeText, onFocus, onBlur, style, ...props }) {
  const [focused, setFocused] = useState(false);
  const ref = useRef(null);

  const handleFocus = (e) => {
    setFocused(true);
    const len = String(value ?? "").length;
    requestAnimationFrame(() => {
      if (!ref.current) return;
      if (typeof ref.current.setSelection === "function") ref.current.setSelection(len, len);
      else if (typeof ref.current.setSelectionRange === "function") ref.current.setSelectionRange(len, len);
    });
    onFocus?.(e);
  };

  const handleBlur = (e) => {
    setFocused(false);
    onBlur?.(e);
  };

  const isEmpty = value === "" || value === undefined || value === null;
  const displayValue = focused || isEmpty ? value ?? "" : formatMoney(parseFloat(String(value).replace(",", ".")) || 0);

  return (
    <TextInput
      ref={ref}
      style={style}
      keyboardType="decimal-pad"
      value={displayValue}
      onChangeText={onChangeText}
      onFocus={handleFocus}
      onBlur={handleBlur}
      {...props}
    />
  );
}
