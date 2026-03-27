package com.checkATS.runner;

import com.checkATS.service.ETLservice;
import org.springframework.ai.document.Document;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;
import java.util.List;

@Component
public class ResumeTest implements CommandLineRunner {

    // ETLservice from service folder
    private final ETLservice etlService;

    //variable names must match
    public ResumeTest(ETLservice etlService) {
        this.etlService = etlService;
    }

    @Override
    public void run(String... args) throws Exception {
        System.out.println("=== Starting Resume ETL Test ===");

        // Make sure this filename matches exactly what is in src/main/resources
        ClassPathResource pdfFile = new ClassPathResource("Manalansang_Resume.pdf");

        if (!pdfFile.exists()) {
            System.err.println("Error: File 'Manalansang_Resume.pdf' not found in resources!");
            return;
        }

        // 3. Use the new method name we wrote in EtlService
        List<Document> chunks = etlService.processResumeForAnalysis(pdfFile);

        System.out.println("ETL Successful!");
        System.out.println("Total Chunks Created: " + chunks.size());

        for (int i = 0; i < chunks.size(); i++) {
            System.out.println("--- Chunk " + (i + 1) + " ---");
            System.out.println(chunks.get(i).getContent());
            System.out.println("---------------------------------------------------");
        }
    }
}