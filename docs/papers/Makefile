# Makefile for compiling the LaTeX document

LATEX = xelatex
BIBTEX = bibtex

TARGET = early_stopping

all: $(TARGET).pdf

$(TARGET).pdf: $(TARGET).tex $(TARGET).bbl
	$(LATEX) $(TARGET).tex
	$(LATEX) $(TARGET).tex

$(TARGET).bbl: $(TARGET).aux
	$(BIBTEX) $(TARGET)

$(TARGET).aux: $(TARGET).tex
	$(LATEX) $(TARGET).tex

clean:
	rm -f *.aux *.bbl *.blg *.log *.out *.toc

.PHONY: all clean 