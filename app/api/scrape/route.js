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
        const index = pinecone.index(indexName);

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
                console.log(response.data.data[0])

                const embedding = response.data.data[0].embedding;

                // Prepare the vector object
                const processed = []
                processed.push({
                    values: embedding,
                    id: review.name, // Unique identifier for the professor
                    metadata: {
                        review: review.reviews.join('; '),
                        subject: review.subjects1.join(', '),
                        stars: review.stars,
                    }
                });
                //processed.push(vector)

                console.log('Processed data:', processed);
                console.log(processed.length)


                // Upsert the vector into Pinecone
                const upsertResponse = await index.namespace('ns1').upsert(
                    processed
                );

                console.log(`Upserted count: ${upsertResponse}`);
            } catch (error) {
                console.error('Error inserting data into Pinecone:', error);
            }
        }

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
