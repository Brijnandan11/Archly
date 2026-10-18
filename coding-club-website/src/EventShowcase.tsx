import React from 'react';
import {Events} from './PublicPages';

/** Original filterable event-card layout, kept inside the homepage scroll chapter. */
export default function EventShowcase({store}:any){
 return <div className="event-showcase" data-lenis-prevent><Events store={store}/></div>;
}
