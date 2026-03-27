package com.checkATS.service;

import org.springframework.ai.document.Document;
import org.springframework.ai.reader.pdf.PagePdfDocumentReader;
import org.springframework.ai.transformer.splitter.TokenTextSplitter;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Service;
import java.util.List;

@Service
public class ETLservice {

    /**
     * Recommended for STAR analysis: Uses larger chunks to keep context intact.
     */
    public List<Document> processResumeForAnalysis(Resource pdfResource) {
        List<Document> rawPages = extractPages(pdfResource);

        TokenTextSplitter splitter = new TokenTextSplitter(
                1200, // defaultChunkSize
                400,  // minChunkSizeChars
                5,    // minChunkLengthToEmbed
                10000,// maxNumChunks
                true  // keepSeparator
        );

        return splitter.apply(rawPages);
    }

    /**
     * Standard ingestion: Uses default Spring AI settings.
     */
    public List<Document> processResumeDefault(Resource pdfResource) {
        List<Document> rawPages = extractPages(pdfResource);
        return new TokenTextSplitter().apply(rawPages);
    }

    // Private helper to handle the "Extract" part of ETL
    private List<Document> extractPages(Resource pdfResource) {
        PagePdfDocumentReader reader = new PagePdfDocumentReader(pdfResource);
        return reader.get();
    }
}