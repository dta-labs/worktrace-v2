import { Injectable, inject } from '@angular/core';
import { Firestore, collection, getDocs, orderBy, query, startAfter } from '@angular/fire/firestore';
import type { DocumentData, QueryDocumentSnapshot } from 'firebase/firestore';
import { CandidateSearchField } from '@app/models/candidateSearchField';

export interface CandidateFilterRecord {
  id: string;
  data: Record<string, unknown>;
  snapshot: QueryDocumentSnapshot<DocumentData>;
}

export interface CandidateFilterPageResult {
  records: CandidateFilterRecord[];
  lastVisible: QueryDocumentSnapshot<DocumentData> | null;
}

@Injectable({ providedIn: 'root' })
export class CandidateService {
  private readonly firestore = inject(Firestore);

  // Builds normalized substrings for each provided candidate field/value pair.
  buildStringFieldSubstrings(fields: CandidateSearchField[]): Record<string, string[]> {
    const substringsByField: Record<string, string[]> = {};

    for (const candidateField of fields) {
      const field = this.readString(candidateField.field);
      if (!field || this.isIdField(field)) {
        continue;
      }

      const value = this.readString(candidateField.value);
      if (!value) {
        continue;
      }

      const substrings = this.getPossibleSubstrings(value);
      if (substrings.length > 0) {
        substringsByField[field] = substrings;
      }
    }

    return substringsByField;
  }

  // Builds all normalized substrings used to pre-index a field value.
  getPossibleSubstrings(value: string): string[] {
    const normalized = this.normalizeValue(this.readString(value));
    if (!normalized) {
      return [];
    }

    const substrings = new Set<string>();

    for (let start = 0; start < normalized.length; start += 1) {
      for (let end = start + 1; end <= normalized.length; end += 1) {
        substrings.add(normalized.slice(start, end));
      }
    }

    return Array.from(substrings);
  }

  // Counts how many candidates match the search term via searchSubstringsByField.
  async countByTerm(term: string): Promise<number> {
    return (await this.findMatchingRecords(term)).length;
  }

  // Returns one paginated slice of candidates matching the term via searchSubstringsByField.
  async loadFilterPage(term: string, pageSize: number, after?: QueryDocumentSnapshot<DocumentData> | null): Promise<CandidateFilterPageResult> {
    const records = (await this.findMatchingRecords(term, after)).slice(0, pageSize);
    return {
      records,
      lastVisible: records.at(-1)?.snapshot ?? null,
    };
  }

  // Loads all candidate records from Firestore, optionally starting after a cursor.
  private async loadAllCandidates(after?: QueryDocumentSnapshot<DocumentData> | null): Promise<CandidateFilterRecord[]> {
    const candidatesRef = collection(this.firestore, 'candidates');
    const q = after
      ? query(candidatesRef, orderBy('displayName'), startAfter(after))
      : query(candidatesRef, orderBy('displayName'));
    const snapshot = await getDocs(q);

    return snapshot.docs.map((doc) => ({
      id: doc.id,
      data: doc.data() as Record<string, unknown>,
      snapshot: doc,
    }));
  }

  // Filters candidates whose searchSubstringsByField contains all normalized tokens.
  private async findMatchingRecords(term: string, after?: QueryDocumentSnapshot<DocumentData> | null): Promise<CandidateFilterRecord[]> {
    const tokens = this.normalizeTokens(term);
    if (tokens.length === 0) {
      return [];
    }

    const allRecords = await this.loadAllCandidates(after);
    return allRecords.filter((record) => this.matchesBySubstrings(record, tokens));
  }

  // Returns true when every token matches at least one field's substring list.
  private matchesBySubstrings(record: CandidateFilterRecord, tokens: string[]): boolean {
    const substringsByField = record.data['searchSubstringsByField'];
    if (!substringsByField || typeof substringsByField !== 'object') {
      return false;
    }

    const fieldValues = Object.values(substringsByField as Record<string, unknown>);

    /*let result : Boolean = tokens.every((token) =>
        fieldValues.some((substrings) =>
            Array.isArray(substrings) && (substrings as string[]).includes(token) ? console.log(substrings) :
                console.log(`Token '${token}' not found in field '${Object.keys(substringsByField)[fieldValues.indexOf(substrings)]}' for record ${record.id}`
                )
        ));*/

    return tokens.every((token) =>
      fieldValues.some((substrings) =>
        Array.isArray(substrings) && (substrings as string[]).includes(token)
      )
    );
  }

  // Splits and normalizes a search term into individual tokens.
  private normalizeTokens(term: string): string[] {
    return term
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      //.replace(/[_\-/\\(),.]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      //.split(/\s+/)
      .split(' ')
      .filter(Boolean);
  }

  private isIdField(field: string): boolean {
    return field.endsWith('id') || field.endsWith('Id');
  }

  private readString(value: unknown): string {
    return typeof value === 'string' ? value.trim() : '';
  }

  private normalizeValue(value: string): string {
    return value
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[_\-/\\(),.]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }
}
