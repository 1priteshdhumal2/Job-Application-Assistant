import type { ReactElement } from "react";
import { Link } from "react-router-dom";
import type { DocumentRecord } from "@jobpilot/types";
import { DocumentTypeBadge } from "./DocumentTypeBadge";

export interface DocumentTableProps {
  documents: DocumentRecord[];
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function formatDate(isoString: string): string {
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) {
      return isoString;
    }
    return date.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return isoString;
  }
}

export function DocumentTable({ documents }: DocumentTableProps): ReactElement {
  return (
    <div className="card documents-table-container">
      <table className="documents-table">
        <thead>
          <tr>
            <th scope="col">Name</th>
            <th scope="col">Type</th>
            <th scope="col">Category</th>
            <th scope="col">Version</th>
            <th scope="col">Size</th>
            <th scope="col">Updated</th>
            <th scope="col" className="documents-table-action-header">
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          {documents.map((doc) => (
            <tr key={doc.id} className="documents-table-row">
              <td className="document-name-cell">
                <span className="document-name-text" title={doc.name}>
                  {doc.name}
                </span>
              </td>
              <td>
                <DocumentTypeBadge type={doc.document_type} />
              </td>
              <td>
                <span className="document-category-label">{doc.category}</span>
              </td>
              <td>
                <span className="document-version-pill">v{doc.version}</span>
              </td>
              <td className="document-size-cell">
                {formatFileSize(doc.file_size)}
              </td>
              <td className="document-date-cell">
                {formatDate(doc.updated_at || doc.created_at)}
              </td>
              <td className="documents-table-action-cell">
                <Link
                  to={`/app/documents/${doc.id}`}
                  className="btn btn-secondary btn-sm"
                  aria-label={`View details for ${doc.name}`}
                >
                  View
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
