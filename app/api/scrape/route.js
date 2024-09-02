import axios from 'axios';
import * as cheerio from 'cheerio';
import { Configuration, OpenAIApi } from 'openai';
import { NextResponse } from "next/server";
import pretty from 'pretty'
import OpenAI from 'openai'
import { Pinecone } from '@pinecone-database/pinecone';


export async function POST(req, res) {
        const body = await req.json();
        const professorUrl  = body[0];
        const fs = require('fs')
        const path = require('path');
       

        //START PINECONE

        //const dotenv = require('dotenv');
        //const { PineconeClient } = require('@pinecone-database/pinecone');



        // Load environment variables
        //dotenv.config();

        // Initialize Pinecone client
        const pinecone = new Pinecone({
            apiKey: process.env.PINECONE_API_KEY,
        });

        // Connect to your Pinecone index
        const indexName = "rag";
        const index = pinecone.Index(indexName);

        const openaiApiKey = process.env.OPENAI_API_KEY;

        // Function to insert new review data into Pinecone
        async function insertNewData(review) {
            try {
                // Generate embedding for the review text using OpenAI
                const response = await axios.post(
                    'https://api.openai.com/v1/embeddings',
                    {
                        input: review.reviews,
                        model: "text-embedding-3-small" // Use the appropriate model
                    },
                    {
                        headers: {
                            'Authorization': `Bearer ${openaiApiKey}`,
                            'Content-Type': 'application/json'
                        }
                    }
                );

                const embedding = response.data.data[0].embedding;

                // Prepare the vector object
                const processed = []
                const vector = {
                    id: review.name, // Unique identifier for the professor
                    values: embedding,
                    metadata: {
                        review: review.reviews,
                        subject: review.subjects1,
                        stars: review.stars,
                    }
                };
                processed.push(vector)

                console.log('Processed data:', JSON.stringify(processed, null, 2));
                console.log(processed.length)


                // Upsert the vector into Pinecone
                const upsertResponse = await index.upsert({
                    vectors: processed,
                    namespace: "ns1", // Optional namespace
                });

                console.log(`Upserted count: ${upsertResponse.upsertedCount}`);
            } catch (error) {
                console.error('Error inserting data into Pinecone:', error);
            }
        }

        // Resolve the path to reviews.json
        /* const reviewsPath = path.join(__dirname, '..', '..','..', 'reviews.json');

        // Require the JSON file using the resolved path
        console.log(reviewsPath)
        const reviews1 = require(reviewsPath); */

        try {
            // Web scraping
            const response = await axios.get(professorUrl);
            const $ = cheerio.load(response.data);

            //console.log(pretty($.html()));

            const professorName = $('.NameTitle__Name-dowf0z-0.cfjPUG span').first().text().trim();
            const lastName = $('.NameTitle__Name-dowf0z-0.cfjPUG span').eq(1).text().trim();
            const subjects = new Set()
            $('div.RatingHeader__StyledClass-sc-1dlkqw1-3.eXfReS').each((index, element) => {
                if ($(element).text().trim())
                subjects.add($(element).text().trim());
            });
            const stars = parseInt($('div.RatingValue__Numerator-qw8sqy-2').text().trim());
            const reviews = [];
            $('div.Comments__StyledComments-dzzyvm-0').each((index, element) => {
                reviews.push($(element).text().trim());
            });
            let subjects1 = Array.from(subjects)
            let name = `${professorName} ${lastName}`
            const scrapedData = {
                name,
                subjects1, 
                stars,
                reviews
            };
            console.log(scrapedData)
            insertNewData(scrapedData)
            //teachers.push(scraped)
/* 
            fs.writeFile(
                "reviews1.json",
                JSON.stringify(reviews1),
                err => {
                    // Checking for errors 
                    if (err) throw err;
            
                    // Success 
                    console.log("Done writing");
                }) */
            // Send the scraped data to the OpenAI API
            /* const openai = new OpenAIApi(new Configuration({
                apiKey: process.env.OPENAI_API_KEY, // Make sure to set your OpenAI API key in the environment variables
            }));

            const openaiResponse = await openai.createCompletion({
                model: "gpt-3.5-turbo",
                prompt: `Summarize the following data about a professor:\n\n${JSON.stringify(scrapedData, null, 2)}`,
                max_tokens: 100,
            });
 */

            //const summary = openaiResponse.data.choices[0].text.trim();
            //return new NextResponse(summary)
            const scraped = JSON.stringify(scrapedData, null, 2)
            console.log(scraped)

            //res.status(200).json({ scraped });
            return NextResponse.json({ scraped });
        } catch (error) {
            console.error('Error during scraping or OpenAI request:', error);
            return new NextResponse('Failed to process the request.', { status: 500 });
            //res.status(500).json({ error: 'Failed to process the request.' });
        }
        
}






/* // Example of inserting new review data
const newReview = {
    professor: "Professor X",
    review: "This professor was excellent in explaining the concepts.",
    subject: "Computer Science",
    stars: 5
};

// Call the function to insert new review data
insertNewData(newReview);
 */