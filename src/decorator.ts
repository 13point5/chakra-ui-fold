import { Range, TextEditor } from "vscode";
import { FoldedDecorationType, UnfoldedDecorationType } from "./decorations";

import { Settings } from "./configuration";
import * as Config from "./configuration";

export class Decorator {
  activeEditor: TextEditor;

  autoFold: boolean = false;
  unfoldIfLineSelected: boolean = false;
  supportedLanguages: string[] = [];

  regEx = /(sx)=({(?:[^{}]+|{(?:[^{}]+|{(?:[^{}]+|{[^{}]*})*})+})*})/gs;
  regExGroup = 0;

  unfoldedDecorationType = UnfoldedDecorationType();
  foldedDecorationType = FoldedDecorationType();

  foldedRanges: Range[] = [];
  unfoldedRanges: Range[] = [];

  setActiveEditor(textEditor: TextEditor | undefined) {
    if (!textEditor) {
      return;
    }
    this.activeEditor = textEditor;
    this.updateDecorations();
  }

  toggleAutoFold(): boolean {
    this.autoFold = !this.autoFold;
    this.updateDecorations();

    Config.set(Settings.AutoFold, this.autoFold);
    return this.autoFold;
  }

  loadConfig() {
    this.autoFold = Config.get<boolean>(Settings.AutoFold) ?? false;
    this.unfoldIfLineSelected =
      Config.get<boolean>(Settings.UnfoldIfLineSelected) ?? false;
    this.supportedLanguages =
      Config.get<string[]>(Settings.SupportedLanguages) ?? [];
    this.regExGroup = Config.get<string>(Settings.FoldStyle) === "ALL" ? 0 : 4;

    this.unfoldedDecorationType.dispose();
    this.foldedDecorationType.dispose();
    this.unfoldedDecorationType = UnfoldedDecorationType();
    this.foldedDecorationType = FoldedDecorationType();
    this.updateDecorations();
  }

  updateDecorations() {
    if (!this.activeEditor) {
      return;
    }
    if (
      !this.supportedLanguages.includes(this.activeEditor.document.languageId)
    ) {
      return;
    }

    const documentText = this.activeEditor.document.getText();
    this.foldedRanges = [];
    this.unfoldedRanges = [];

    let match;
    while ((match = this.regEx.exec(documentText))) {
      if (match && !match[2]) {
        continue;
      }

      // const text = match[0];
      // const textToFold = match[2];
      // const foldStartIndex = text.indexOf(textToFold);

      // const foldStartPosition = this.activeEditor.document.positionAt(
      //   match.index + foldStartIndex
      // );
      // const foldEndPosition = this.activeEditor.document.positionAt(
      //   match.index + foldStartIndex + textToFold.length
      // );
      const text = match[0];
      const textToFold = match[2];
      console.log("match", match);
      const foldStartIndex = text.indexOf(textToFold);
      const foldEndIndex = foldStartIndex + textToFold.length;

      const foldStartPosition = this.activeEditor.document.positionAt(
        match.index + foldStartIndex - 1 // adjust for '{' before 'sx'
      );
      const foldEndPosition = this.activeEditor.document.positionAt(
        match.index + foldEndIndex // no need to adjust for closing '}' of the value
      );
      const range = new Range(foldStartPosition, foldEndPosition);

      if (
        !this.autoFold ||
        this.isRangeSelected(range) ||
        (this.unfoldIfLineSelected && this.isLineOfRangeSelected(range))
      ) {
        this.unfoldedRanges.push(range);
        continue;
      }

      this.foldedRanges.push(range);
    }

    this.activeEditor.setDecorations(
      this.unfoldedDecorationType,
      this.unfoldedRanges
    );
    this.activeEditor.setDecorations(
      this.foldedDecorationType,
      this.foldedRanges
    );
  }

  isRangeSelected(range: Range): boolean {
    return !!(
      this.activeEditor.selection.contains(range) ||
      this.activeEditor.selections.find((s) => range.contains(s))
    );
  }

  isLineOfRangeSelected(range: Range): boolean {
    return !!this.activeEditor.selections.find(
      (s) => s.start.line === range.start.line
    );
  }
}
