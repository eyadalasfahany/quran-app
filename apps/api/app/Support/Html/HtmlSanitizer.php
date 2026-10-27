<?php

declare(strict_types=1);

namespace App\Support\Html;

use Dom\Element;
use Dom\HTMLDocument;
use Dom\Node;

final class HtmlSanitizer
{
    /** @var list<string> */
    private const array ALLOWED = [
        'p', 'br', 'b', 'strong', 'i', 'em', 'span', 'h1', 'h2', 'h3', 'h4', 'blockquote', 'sup', 'sub',
    ];

    /** @var list<string> */
    private const array REMOVED = [
        'script', 'style', 'iframe', 'object', 'embed', 'form', 'img', 'video', 'audio',
    ];

    public function sanitize(string $html): string
    {
        if ($html === '') {
            return '';
        }

        $document = HTMLDocument::createFromString($html, LIBXML_NOERROR);
        $body = $document->body;

        if (! $body instanceof Element) {
            return '';
        }

        $this->clean($body);

        return $this->serializeChildren($body);
    }

    public function textContent(string $html): string
    {
        if ($html === '') {
            return '';
        }

        $document = HTMLDocument::createFromString($html, LIBXML_NOERROR);
        $body = $document->body;

        if (! $body instanceof Element) {
            return '';
        }

        return $body->textContent ?? '';
    }

    private function clean(Element $element): void
    {
        $children = [];

        foreach ($element->childNodes as $child) {
            $children[] = $child;
        }

        foreach ($children as $child) {
            if ($child->nodeType === XML_COMMENT_NODE) {
                $element->removeChild($child);

                continue;
            }

            if (! $child instanceof Element) {
                continue;
            }

            $name = strtolower($child->tagName);

            if (in_array($name, self::REMOVED, true)) {
                $element->removeChild($child);

                continue;
            }

            if (! in_array($name, self::ALLOWED, true)) {
                $this->unwrap($element, $child);

                continue;
            }

            while ($child->attributes->length > 0) {
                $attribute = $child->attributes->item(0);

                if ($attribute === null) {
                    break;
                }

                $child->removeAttribute($attribute->name);
            }

            $this->clean($child);
        }
    }

    private function unwrap(Element $parent, Element $element): void
    {
        $this->clean($element);

        while ($element->firstChild instanceof Node) {
            $parent->insertBefore($element->firstChild, $element);
        }

        $parent->removeChild($element);
    }

    private function serializeChildren(Element $element): string
    {
        $html = '';

        foreach ($element->childNodes as $child) {
            $html .= $this->serialize($child);
        }

        return $html;
    }

    private function serialize(Node $node): string
    {
        if (! $node instanceof Element) {
            return $node->textContent ?? '';
        }

        $name = strtolower($node->tagName);

        if ($name === 'br') {
            return '<br>';
        }

        return '<'.$name.'>'.$this->serializeChildren($node).'</'.$name.'>';
    }
}
